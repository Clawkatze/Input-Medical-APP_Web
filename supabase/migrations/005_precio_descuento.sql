-- =============================================================================
-- Input Medical - Migration 005: Precio con Descuento por Producto
-- Reemplaza la lógica de descuento por venta por un precio rebajado fijo
-- por producto (igual al campo V.DESC del Excel de inventario)
-- =============================================================================

-- ─── Agregar precio_descuento a productos ────────────────────────────────────
-- Cuando está definido, reemplaza al precio_unitario en cálculos de total
ALTER TABLE productos
  ADD COLUMN IF NOT EXISTS precio_descuento NUMERIC(12,2) DEFAULT NULL
    CHECK (precio_descuento IS NULL OR precio_descuento >= 0);

-- ─── Vista: precio vigente por producto (usa descuento si existe) ─────────────
-- precio_vigente = precio_descuento si existe, sino precio_unitario
CREATE OR REPLACE VIEW v_valor_inventario AS
SELECT
  p.id,
  p.sku,
  p.nombre,
  c.nombre                                                      AS categoria_nombre,
  p.stock_actual,
  p.stock_minimo,
  p.unidad_medida,
  p.precio_unitario,
  p.precio_descuento,
  COALESCE(p.precio_descuento, p.precio_unitario)               AS precio_vigente,
  p.stock_actual * COALESCE(p.precio_descuento, p.precio_unitario) AS valor_total_producto
FROM productos p
LEFT JOIN categorias c ON c.id = p.categoria_id
WHERE p.activo = true
ORDER BY p.nombre;

-- ─── Actualizar función gran total ───────────────────────────────────────────
CREATE OR REPLACE FUNCTION fn_gran_total_inventario()
RETURNS NUMERIC LANGUAGE SQL AS $$
  SELECT COALESCE(SUM(stock_actual * COALESCE(precio_descuento, precio_unitario)), 0)
  FROM productos
  WHERE activo = true;
$$;

-- ─── Actualizar función fn_registrar_salida ───────────────────────────────────
-- Ya no recibe descuento como parámetro.
-- Usa precio_vigente del producto automáticamente.
-- Mantiene compatibilidad con los parámetros anteriores para no romper el backend.
CREATE OR REPLACE FUNCTION fn_registrar_salida(
  p_producto_id          UUID,
  p_cantidad             INTEGER,
  p_motivo               VARCHAR DEFAULT 'VENTA',
  p_observacion          TEXT    DEFAULT NULL,
  p_usuario_email        VARCHAR DEFAULT NULL,
  p_precio_unitario      NUMERIC DEFAULT NULL,  -- si NULL usa el precio vigente del producto
  p_descuento_porcentaje NUMERIC DEFAULT 0,     -- mantenido por compatibilidad, ya no se usa
  p_descuento_monto      NUMERIC DEFAULT 0      -- mantenido por compatibilidad, ya no se usa
)
RETURNS SETOF UUID LANGUAGE plpgsql AS $$
DECLARE
  v_stock_disponible  INTEGER;
  v_restante          INTEGER := p_cantidad;
  v_lote              RECORD;
  v_consumir          INTEGER;
  v_mov_id            UUID;
  v_precio_vigente    NUMERIC;
  v_subtotal          NUMERIC;
  v_total             NUMERIC;
BEGIN
  -- Verificar stock
  SELECT stock_actual INTO v_stock_disponible FROM productos WHERE id = p_producto_id;
  IF v_stock_disponible < p_cantidad THEN
    RAISE EXCEPTION 'Stock insuficiente. Disponible: %, Solicitado: %', v_stock_disponible, p_cantidad;
  END IF;

  -- Determinar precio vigente:
  -- Si se pasa precio explícito lo usa, sino toma precio_descuento o precio_unitario del producto
  IF p_precio_unitario IS NOT NULL AND p_precio_unitario > 0 THEN
    v_precio_vigente := p_precio_unitario;
  ELSE
    SELECT COALESCE(precio_descuento, precio_unitario, 0)
    INTO v_precio_vigente
    FROM productos WHERE id = p_producto_id;
  END IF;

  v_subtotal := v_precio_vigente * p_cantidad;
  v_total    := v_subtotal;

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
    ) VALUES (
      p_producto_id, v_lote.id, 'SALIDA', v_consumir, p_motivo, p_observacion, p_usuario_email,
      v_precio_vigente, 0, 0, v_subtotal, v_total
    ) RETURNING id INTO v_mov_id;

    v_restante := v_restante - v_consumir;
    RETURN NEXT v_mov_id;
  END LOOP;

  UPDATE productos SET stock_actual = stock_actual - p_cantidad WHERE id = p_producto_id;
END;
$$;
