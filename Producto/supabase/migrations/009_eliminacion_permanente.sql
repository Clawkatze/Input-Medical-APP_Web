-- =============================================================================
-- Input Medical - Migration 009: Eliminación permanente de productos
-- =============================================================================

-- Campo para registrar cuándo fue eliminado permanentemente
ALTER TABLE productos
  ADD COLUMN IF NOT EXISTS eliminado_at TIMESTAMPTZ DEFAULT NULL;

-- Columna de respaldo del nombre en movimientos históricos
ALTER TABLE movimientos
  ADD COLUMN IF NOT EXISTS producto_nombre_cache VARCHAR(200) DEFAULT NULL;

-- ─── Función para eliminar permanentemente ───────────────────────────────────
-- Guarda el nombre en los movimientos antes de marcar como eliminado
CREATE OR REPLACE FUNCTION fn_eliminar_producto(p_producto_id UUID)
RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE
  v_nombre VARCHAR;
BEGIN
  SELECT nombre INTO v_nombre FROM productos WHERE id = p_producto_id;

  UPDATE movimientos
  SET producto_nombre_cache = v_nombre
  WHERE producto_id = p_producto_id;

  UPDATE productos
  SET eliminado_at = NOW(), activo = false
  WHERE id = p_producto_id;
END;
$$;

-- ─── Vista v_movimientos_recientes ───────────────────────────────────────────
-- Usa el cache si el producto fue eliminado permanentemente
DROP VIEW IF EXISTS v_movimientos_recientes;

CREATE VIEW v_movimientos_recientes AS
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
  COALESCE(p.nombre, m.producto_nombre_cache, '[Producto eliminado]') AS producto_nombre,
  COALESCE(p.sku, '[eliminado]')                                      AS producto_sku,
  l.numero_lote,
  l.fecha_vencimiento,
  p.eliminado_at IS NOT NULL AS producto_eliminado
FROM movimientos m
LEFT JOIN productos p ON p.id = m.producto_id
LEFT JOIN lotes l ON l.id = m.lote_id
ORDER BY m.created_at DESC;

-- ─── Vista v_valor_inventario ─────────────────────────────────────────────────
-- Excluye productos eliminados permanentemente
DROP VIEW IF EXISTS v_valor_inventario;

CREATE VIEW v_valor_inventario AS
SELECT
  p.id,
  p.sku,
  p.codigo_barras,
  p.nombre,
  p.activo,
  c.nombre                                                         AS categoria_nombre,
  p.stock_actual,
  p.stock_minimo,
  p.unidad_medida,
  p.precio_unitario,
  p.precio_descuento,
  COALESCE(p.precio_descuento, p.precio_unitario)                  AS precio_vigente,
  p.stock_actual * COALESCE(p.precio_descuento, p.precio_unitario) AS valor_total_producto
FROM productos p
LEFT JOIN categorias c ON c.id = p.categoria_id
WHERE p.eliminado_at IS NULL
ORDER BY p.activo DESC, p.nombre ASC;

-- ─── Función gran total ───────────────────────────────────────────────────────
-- Excluye productos eliminados permanentemente
CREATE OR REPLACE FUNCTION fn_gran_total_inventario()
RETURNS NUMERIC LANGUAGE SQL AS $$
  SELECT COALESCE(SUM(stock_actual * COALESCE(precio_descuento, precio_unitario)), 0)
  FROM productos
  WHERE activo = true AND eliminado_at IS NULL;
$$;