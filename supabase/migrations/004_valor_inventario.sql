-- =============================================================================
-- Input Medical - Migration 004: Valor Total del Inventario
-- Ejecutar DESPUÉS de 003_precios.sql
-- =============================================================================

-- ─── Vista: valor total por producto y gran total ─────────────────────────────
CREATE OR REPLACE VIEW v_valor_inventario AS
SELECT
  p.id,
  p.sku,
  p.nombre,
  c.nombre             AS categoria_nombre,
  p.stock_actual,
  p.stock_minimo,
  p.unidad_medida,
  p.precio_unitario,
  p.stock_actual * p.precio_unitario AS valor_total_producto
FROM productos p
LEFT JOIN categorias c ON c.id = p.categoria_id
WHERE p.activo = true
ORDER BY p.nombre;

-- ─── Función: retorna el gran total del inventario ────────────────────────────
CREATE OR REPLACE FUNCTION fn_gran_total_inventario()
RETURNS NUMERIC LANGUAGE SQL AS $$
  SELECT COALESCE(SUM(stock_actual * precio_unitario), 0)
  FROM productos
  WHERE activo = true;
$$;
