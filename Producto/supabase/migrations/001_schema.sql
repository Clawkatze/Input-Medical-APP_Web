-- =============================================================================
-- Input Medical - Esquema de Base de Datos
-- Archivo: supabase/migrations/001_schema.sql
--
-- INSTRUCCIONES PARA CONECTAR TU BD EXISTENTE:
-- 1. Abre tu cliente SQL (pgAdmin, DBeaver, psql, etc.)
-- 2. Conéctate a tu BD de PostgreSQL
-- 3. Ejecuta este archivo completo
-- 4. Luego ejecuta 002_seed.sql si quieres datos de demo
-- 5. Actualiza DB_HOST, DB_NAME, DB_USER, DB_PASSWORD en apps/backend/.env
-- =============================================================================

-- ─── Extensiones ─────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================================
-- TABLAS
-- =============================================================================

-- ─── Usuarios del sistema (administradores) ───────────────────────────────────
CREATE TABLE IF NOT EXISTS usuarios (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email           VARCHAR(200) NOT NULL UNIQUE,
  nombre          VARCHAR(100) NOT NULL,
  password_hash   VARCHAR(255) NOT NULL,
  rol             VARCHAR(20) NOT NULL DEFAULT 'admin' CHECK (rol IN ('admin', 'operador')),
  activo          BOOLEAN DEFAULT TRUE,
  ultimo_acceso   TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Categorías de productos ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS categorias (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre      VARCHAR(100) NOT NULL UNIQUE,
  descripcion TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Productos (catálogo maestro) ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS productos (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  codigo_barras     VARCHAR(50) UNIQUE,
  sku               VARCHAR(50) UNIQUE NOT NULL,
  nombre            VARCHAR(200) NOT NULL,
  descripcion       TEXT,
  categoria_id      UUID REFERENCES categorias(id) ON DELETE SET NULL,
  stock_actual      INTEGER NOT NULL DEFAULT 0 CHECK (stock_actual >= 0),
  stock_minimo      INTEGER NOT NULL DEFAULT 10 CHECK (stock_minimo >= 0),
  unidad_medida     VARCHAR(30) DEFAULT 'unidad',
  tiene_vencimiento BOOLEAN DEFAULT TRUE,
  activo            BOOLEAN DEFAULT TRUE,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Lotes (cada entrada genera un lote - base de FIFO) ───────────────────────
-- La lógica FIFO consiste en consumir primero el lote con fecha_vencimiento
-- más próxima (menor fecha) que aún tenga cantidad_actual > 0.
CREATE TABLE IF NOT EXISTS lotes (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  producto_id       UUID NOT NULL REFERENCES productos(id) ON DELETE RESTRICT,
  numero_lote       VARCHAR(100) NOT NULL,
  fecha_vencimiento DATE,
  cantidad_inicial  INTEGER NOT NULL CHECK (cantidad_inicial > 0),
  cantidad_actual   INTEGER NOT NULL CHECK (cantidad_actual >= 0),
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(producto_id, numero_lote)
);

-- ─── Movimientos de inventario (Kardex) ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS movimientos (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  producto_id   UUID NOT NULL REFERENCES productos(id) ON DELETE RESTRICT,
  lote_id       UUID REFERENCES lotes(id) ON DELETE SET NULL,
  tipo          VARCHAR(10) NOT NULL CHECK (tipo IN ('ENTRADA', 'SALIDA')),
  cantidad      INTEGER NOT NULL CHECK (cantidad > 0),
  motivo        VARCHAR(20) CHECK (motivo IN ('COMPRA','VENTA','TRASLADO','MERMA','AJUSTE','DEVOLUCION')),
  observacion   TEXT,
  usuario_email VARCHAR(200),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Índices útiles para búsquedas frecuentes
CREATE INDEX IF NOT EXISTS idx_movimientos_producto  ON movimientos(producto_id);
CREATE INDEX IF NOT EXISTS idx_movimientos_fecha     ON movimientos(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lotes_producto        ON lotes(producto_id);
CREATE INDEX IF NOT EXISTS idx_lotes_vencimiento     ON lotes(fecha_vencimiento ASC);
CREATE INDEX IF NOT EXISTS idx_productos_barcode     ON productos(codigo_barras);
CREATE INDEX IF NOT EXISTS idx_productos_sku         ON productos(sku);

-- =============================================================================
-- VISTAS
-- =============================================================================

-- ─── Vista: alertas de stock crítico y vencimiento ────────────────────────────
CREATE OR REPLACE VIEW v_alertas AS
SELECT
  p.id,
  p.sku,
  p.nombre,
  p.stock_actual,
  p.stock_minimo,
  CASE WHEN p.stock_actual <= p.stock_minimo THEN TRUE ELSE FALSE END AS alerta_stock,
  MIN(l.fecha_vencimiento) AS proximo_vencimiento,
  CASE
    WHEN MIN(l.fecha_vencimiento) < CURRENT_DATE           THEN 'VENCIDO'
    WHEN MIN(l.fecha_vencimiento) <= CURRENT_DATE + 30     THEN 'PROXIMO'
    ELSE 'OK'
  END AS estado_vencimiento
FROM productos p
LEFT JOIN lotes l ON l.producto_id = p.id AND l.cantidad_actual > 0
WHERE p.activo = TRUE
GROUP BY p.id, p.sku, p.nombre, p.stock_actual, p.stock_minimo;

-- ─── Vista: movimientos con nombre de producto (Kardex) ───────────────────────
CREATE OR REPLACE VIEW v_movimientos_recientes AS
SELECT
  m.id,
  m.producto_id,
  m.created_at,
  m.tipo,
  m.cantidad,
  m.motivo,
  m.observacion,
  m.usuario_email,
  p.nombre AS producto_nombre,
  p.sku    AS producto_sku,
  l.numero_lote,
  l.fecha_vencimiento
FROM movimientos m
JOIN productos p ON p.id = m.producto_id
LEFT JOIN lotes l ON l.id = m.lote_id
ORDER BY m.created_at DESC;

-- =============================================================================
-- FUNCIONES
-- =============================================================================

-- ─── Trigger: actualiza updated_at en productos ───────────────────────────────
CREATE OR REPLACE FUNCTION fn_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_productos_updated_at ON productos;
CREATE TRIGGER trg_productos_updated_at
  BEFORE UPDATE ON productos
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

-- ─── Función: registrar ENTRADA ───────────────────────────────────────────────
-- Crea o incrementa un lote y registra el movimiento de entrada.
CREATE OR REPLACE FUNCTION fn_registrar_entrada(
  p_producto_id   UUID,
  p_numero_lote   VARCHAR,
  p_fecha_venc    DATE,
  p_cantidad      INTEGER,
  p_observacion   TEXT    DEFAULT NULL,
  p_usuario_email VARCHAR DEFAULT NULL
)
RETURNS UUID LANGUAGE plpgsql AS $$
DECLARE
  v_lote_id UUID;
  v_mov_id  UUID;
BEGIN
  -- Insertar lote o sumar si ya existe
  INSERT INTO lotes (producto_id, numero_lote, fecha_vencimiento, cantidad_inicial, cantidad_actual)
  VALUES (p_producto_id, p_numero_lote, p_fecha_venc, p_cantidad, p_cantidad)
  ON CONFLICT (producto_id, numero_lote) DO UPDATE
    SET cantidad_actual = lotes.cantidad_actual + EXCLUDED.cantidad_actual
  RETURNING id INTO v_lote_id;

  -- Actualizar stock total del producto
  UPDATE productos SET stock_actual = stock_actual + p_cantidad WHERE id = p_producto_id;

  -- Registrar movimiento
  INSERT INTO movimientos (producto_id, lote_id, tipo, cantidad, motivo, observacion, usuario_email)
  VALUES (p_producto_id, v_lote_id, 'ENTRADA', p_cantidad, 'COMPRA', p_observacion, p_usuario_email)
  RETURNING id INTO v_mov_id;

  RETURN v_mov_id;
END;
$$;

-- ─── Función: registrar SALIDA con lógica FIFO ────────────────────────────────
-- Consume los lotes ordenados por fecha_vencimiento ASC (primero el que vence antes).
-- Si no hay suficiente stock lanza un error que el backend captura.
CREATE OR REPLACE FUNCTION fn_registrar_salida(
  p_producto_id   UUID,
  p_cantidad      INTEGER,
  p_motivo        VARCHAR DEFAULT 'VENTA',
  p_observacion   TEXT    DEFAULT NULL,
  p_usuario_email VARCHAR DEFAULT NULL
)
RETURNS SETOF UUID LANGUAGE plpgsql AS $$
DECLARE
  v_stock_disponible INTEGER;
  v_restante         INTEGER := p_cantidad;
  v_lote             RECORD;
  v_consumir         INTEGER;
  v_mov_id           UUID;
BEGIN
  -- Verificar stock suficiente antes de tocar nada
  SELECT stock_actual INTO v_stock_disponible FROM productos WHERE id = p_producto_id;
  IF v_stock_disponible < p_cantidad THEN
    RAISE EXCEPTION 'Stock insuficiente. Disponible: %, Solicitado: %', v_stock_disponible, p_cantidad;
  END IF;

  -- Iterar lotes en orden FIFO: menor fecha_vencimiento primero (nulls al final)
  FOR v_lote IN
    SELECT id, cantidad_actual
    FROM lotes
    WHERE producto_id = p_producto_id AND cantidad_actual > 0
    ORDER BY fecha_vencimiento ASC NULLS LAST, created_at ASC
  LOOP
    EXIT WHEN v_restante = 0;
    v_consumir := LEAST(v_restante, v_lote.cantidad_actual);

    UPDATE lotes SET cantidad_actual = cantidad_actual - v_consumir WHERE id = v_lote.id;

    INSERT INTO movimientos (producto_id, lote_id, tipo, cantidad, motivo, observacion, usuario_email)
    VALUES (p_producto_id, v_lote.id, 'SALIDA', v_consumir, p_motivo, p_observacion, p_usuario_email)
    RETURNING id INTO v_mov_id;

    v_restante := v_restante - v_consumir;
    RETURN NEXT v_mov_id;
  END LOOP;

  -- Actualizar stock total del producto
  UPDATE productos SET stock_actual = stock_actual - p_cantidad WHERE id = p_producto_id;
END;
$$;
