-- =============================================================================
-- Input Medical - Migration 003: Precios y Descuentos
-- Ejecutar DESPUÉS de 001_schema.sql y 002_seed.sql
-- =============================================================================

-- ─── Agregar precio_unitario a productos ─────────────────────────────────────
ALTER TABLE productos
  ADD COLUMN IF NOT EXISTS precio_unitario NUMERIC(12,2) DEFAULT 0 CHECK (precio_unitario >= 0);

-- ─── Agregar campos de precio/descuento/total a movimientos ──────────────────
ALTER TABLE movimientos
  ADD COLUMN IF NOT EXISTS precio_unitario     NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS descuento_porcentaje NUMERIC(5,2)  DEFAULT 0 CHECK (descuento_porcentaje BETWEEN 0 AND 100),
  ADD COLUMN IF NOT EXISTS descuento_monto      NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS subtotal             NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total                NUMERIC(12,2) DEFAULT 0;

-- ─── Actualizar vista v_movimientos_recientes ─────────────────────────────────
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
  m.precio_unitario,
  m.descuento_porcentaje,
  m.descuento_monto,
  m.subtotal,
  m.total,
  p.nombre AS producto_nombre,
  p.sku    AS producto_sku,
  l.numero_lote,
  l.fecha_vencimiento
FROM movimientos m
JOIN productos p ON p.id = m.producto_id
LEFT JOIN lotes l ON l.id = m.lote_id
ORDER BY m.created_at DESC;

-- ─── Actualizar función fn_registrar_salida con soporte de precios ────────────
-- Se agrega precio_unitario, descuento_porcentaje y descuento_monto como parámetros.
-- El total se calcula: subtotal = precio * cantidad, descuento aplicado, total final.
CREATE OR REPLACE FUNCTION fn_registrar_salida(
  p_producto_id         UUID,
  p_cantidad            INTEGER,
  p_motivo              VARCHAR DEFAULT 'VENTA',
  p_observacion         TEXT    DEFAULT NULL,
  p_usuario_email       VARCHAR DEFAULT NULL,
  p_precio_unitario     NUMERIC DEFAULT 0,
  p_descuento_porcentaje NUMERIC DEFAULT 0,
  p_descuento_monto     NUMERIC DEFAULT 0
)
RETURNS SETOF UUID LANGUAGE plpgsql AS $$
DECLARE
  v_stock_disponible  INTEGER;
  v_restante          INTEGER := p_cantidad;
  v_lote              RECORD;
  v_consumir          INTEGER;
  v_mov_id            UUID;
  v_subtotal          NUMERIC;
  v_descuento_calc    NUMERIC;
  v_total             NUMERIC;
BEGIN
  -- Verificar stock
  SELECT stock_actual INTO v_stock_disponible FROM productos WHERE id = p_producto_id;
  IF v_stock_disponible < p_cantidad THEN
    RAISE EXCEPTION 'Stock insuficiente. Disponible: %, Solicitado: %', v_stock_disponible, p_cantidad;
  END IF;

  -- Calcular valores económicos
  v_subtotal       := p_precio_unitario * p_cantidad;
  v_descuento_calc := GREATEST(p_descuento_monto, v_subtotal * (p_descuento_porcentaje / 100.0));
  v_total          := GREATEST(0, v_subtotal - v_descuento_calc);

  -- Iterar lotes FIFO
  FOR v_lote IN
    SELECT id, cantidad_actual
    FROM lotes
    WHERE producto_id = p_producto_id AND cantidad_actual > 0
    ORDER BY fecha_vencimiento ASC NULLS LAST, created_at ASC
  LOOP
    EXIT WHEN v_restante = 0;
    v_consumir := LEAST(v_restante, v_lote.cantidad_actual);

    UPDATE lotes SET cantidad_actual = cantidad_actual - v_consumir WHERE id = v_lote.id;

    INSERT INTO movimientos (
      producto_id, lote_id, tipo, cantidad, motivo, observacion, usuario_email,
      precio_unitario, descuento_porcentaje, descuento_monto, subtotal, total
    )
    VALUES (
      p_producto_id, v_lote.id, 'SALIDA', v_consumir, p_motivo, p_observacion, p_usuario_email,
      p_precio_unitario, p_descuento_porcentaje, p_descuento_monto, v_subtotal, v_total
    )
    RETURNING id INTO v_mov_id;

    v_restante := v_restante - v_consumir;
    RETURN NEXT v_mov_id;
  END LOOP;

  UPDATE productos SET stock_actual = stock_actual - p_cantidad WHERE id = p_producto_id;
END;
$$;
