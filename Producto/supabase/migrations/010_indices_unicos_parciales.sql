-- =============================================================================
-- Input Medical - Migration 010: Índices únicos parciales + fn_eliminar_producto
-- =============================================================================

-- ─── Eliminar vistas que dependen de motivo/tipo antes de alterar columnas ───
DROP VIEW IF EXISTS v_movimientos_recientes;
DROP VIEW IF EXISTS v_alertas;

-- ─── Ampliar columnas ────────────────────────────────────────────────────────
ALTER TABLE movimientos ALTER COLUMN motivo TYPE VARCHAR(30);
ALTER TABLE movimientos ALTER COLUMN tipo   TYPE VARCHAR(20);

-- ─── Recrear vistas ──────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW v_alertas AS
SELECT
  p.id, p.sku, p.nombre, p.stock_actual, p.stock_minimo,
  CASE WHEN p.stock_actual <= p.stock_minimo THEN TRUE ELSE FALSE END AS alerta_stock,
  MIN(l.fecha_vencimiento) AS proximo_vencimiento,
  CASE
    WHEN MIN(l.fecha_vencimiento) < CURRENT_DATE       THEN 'VENCIDO'
    WHEN MIN(l.fecha_vencimiento) <= CURRENT_DATE + 30 THEN 'PROXIMO'
    ELSE 'OK'
  END AS estado_vencimiento
FROM productos p
LEFT JOIN lotes l ON l.producto_id = p.id AND l.cantidad_actual > 0
WHERE p.activo = TRUE AND p.eliminado_at IS NULL
GROUP BY p.id, p.sku, p.nombre, p.stock_actual, p.stock_minimo;

CREATE VIEW v_movimientos_recientes AS
SELECT
  m.id, m.producto_id, m.created_at, m.tipo, m.cantidad, m.motivo,
  m.observacion, m.usuario_email,
  m.precio_unitario, m.descuento_porcentaje, m.descuento_monto,
  m.subtotal, m.total,
  COALESCE(p.nombre, m.producto_nombre_cache, '[Producto eliminado]') AS producto_nombre,
  COALESCE(p.sku, '[eliminado]')                                      AS producto_sku,
  l.numero_lote, l.fecha_vencimiento,
  p.eliminado_at IS NOT NULL AS producto_eliminado
FROM movimientos m
LEFT JOIN productos p ON p.id = m.producto_id
LEFT JOIN lotes l ON l.id = m.lote_id
ORDER BY m.created_at DESC;

-- ─── Eliminar constraints y índices únicos originales ────────────────────────
ALTER TABLE productos DROP CONSTRAINT IF EXISTS productos_codigo_barras_key;
ALTER TABLE productos DROP CONSTRAINT IF EXISTS productos_sku_key;
DROP INDEX IF EXISTS idx_productos_sku;
DROP INDEX IF EXISTS idx_productos_barcode;
DROP INDEX IF EXISTS idx_productos_codigo_barras;

-- ─── Crear índices únicos parciales ──────────────────────────────────────────
CREATE UNIQUE INDEX IF NOT EXISTS idx_productos_sku_activo
  ON productos (sku)
  WHERE eliminado_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_productos_barcode_activo
  ON productos (codigo_barras)
  WHERE eliminado_at IS NULL AND codigo_barras IS NOT NULL;

-- ─── fn_eliminar_producto con email ──────────────────────────────────────────
CREATE OR REPLACE FUNCTION fn_eliminar_producto(
  p_producto_id   UUID,
  p_usuario_email VARCHAR DEFAULT NULL
)
RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE
  v_nombre VARCHAR;
BEGIN
  SELECT nombre INTO v_nombre FROM productos WHERE id = p_producto_id;

  UPDATE movimientos
  SET producto_nombre_cache = v_nombre
  WHERE producto_id = p_producto_id;

  INSERT INTO movimientos (
    producto_id, tipo, cantidad, motivo, observacion,
    usuario_email, producto_nombre_cache
  ) VALUES (
    p_producto_id, 'ELIMINACION', 1, 'ELIMINACION_PERMANENTE',
    'Producto eliminado permanentemente del sistema',
    p_usuario_email, v_nombre
  );

  UPDATE productos
  SET eliminado_at = NOW(), activo = false
  WHERE id = p_producto_id;
END;
$$;