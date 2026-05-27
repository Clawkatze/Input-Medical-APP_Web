-- =============================================================================
-- Input Medical - Migration 005: Precio con Descuento (V.DESC) por Producto
-- =============================================================================

ALTER TABLE productos
  ADD COLUMN IF NOT EXISTS precio_descuento NUMERIC(12,2) DEFAULT NULL
    CHECK (precio_descuento IS NULL OR precio_descuento >= 0);

DROP VIEW IF EXISTS v_valor_inventario;

CREATE VIEW v_valor_inventario AS
SELECT
  p.id,
  p.sku,
  p.codigo_barras,
  p.nombre,
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
WHERE p.activo = true
ORDER BY p.nombre;

CREATE OR REPLACE FUNCTION fn_gran_total_inventario()
RETURNS NUMERIC LANGUAGE SQL AS $$
  SELECT COALESCE(SUM(stock_actual * COALESCE(precio_descuento, precio_unitario)), 0)
  FROM productos WHERE activo = true;
$$;
