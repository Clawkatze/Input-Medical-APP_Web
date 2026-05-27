-- =============================================================================
-- Input Medical - Migration 008: fn_registrar_salida definitiva
-- - AJUSTE: solo descuenta unidades, sin precio ni monto
-- - VENTA/MERMA: calcula descuento_monto = (precio_normal - precio_vigente) x cantidad
-- =============================================================================

CREATE OR REPLACE FUNCTION fn_registrar_salida(
  p_producto_id          UUID,
  p_cantidad             INTEGER,
  p_motivo               VARCHAR DEFAULT 'VENTA',
  p_observacion          TEXT    DEFAULT NULL,
  p_usuario_email        VARCHAR DEFAULT NULL,
  p_precio_unitario      NUMERIC DEFAULT NULL,
  p_descuento_porcentaje NUMERIC DEFAULT 0,
  p_descuento_monto      NUMERIC DEFAULT 0
)
RETURNS SETOF UUID LANGUAGE plpgsql AS $$
DECLARE
  v_stock_disponible  INTEGER;
  v_restante          INTEGER := p_cantidad;
  v_lote              RECORD;
  v_consumir          INTEGER;
  v_mov_id            UUID;
  v_precio_normal     NUMERIC;
  v_precio_descuento  NUMERIC;
  v_precio_vigente    NUMERIC;
  v_descuento_total   NUMERIC;
  v_subtotal          NUMERIC;
  v_total             NUMERIC;
  v_es_ajuste         BOOLEAN;
BEGIN
  SELECT stock_actual INTO v_stock_disponible FROM productos WHERE id = p_producto_id;
  IF v_stock_disponible < p_cantidad THEN
    RAISE EXCEPTION 'Stock insuficiente. Disponible: %, Solicitado: %', v_stock_disponible, p_cantidad;
  END IF;

  v_es_ajuste := (p_motivo = 'AJUSTE');

  IF v_es_ajuste THEN
    v_precio_vigente  := 0;
    v_descuento_total := 0;
    v_subtotal        := 0;
    v_total           := 0;
  ELSE
    SELECT precio_unitario, precio_descuento
    INTO v_precio_normal, v_precio_descuento
    FROM productos WHERE id = p_producto_id;

    v_precio_vigente  := COALESCE(v_precio_descuento, v_precio_normal, 0);
    v_descuento_total := GREATEST(0, COALESCE(v_precio_normal, 0) - v_precio_vigente) * p_cantidad;
    v_subtotal        := COALESCE(v_precio_normal, 0) * p_cantidad;
    v_total           := v_precio_vigente * p_cantidad;
  END IF;

  FOR v_lote IN
    SELECT id, cantidad_actual FROM lotes
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
      CASE WHEN v_es_ajuste THEN NULL ELSE v_precio_vigente END,
      0,
      v_descuento_total,
      CASE WHEN v_es_ajuste THEN NULL ELSE v_subtotal END,
      CASE WHEN v_es_ajuste THEN NULL ELSE v_total END
    ) RETURNING id INTO v_mov_id;

    v_restante := v_restante - v_consumir;
    RETURN NEXT v_mov_id;
  END LOOP;

  UPDATE productos SET stock_actual = stock_actual - p_cantidad WHERE id = p_producto_id;
END;
$$;
