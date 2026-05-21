-- =============================================================================
-- Input Medical - Migration 007: Precio en Entradas + Ajustes de vistas
-- =============================================================================

-- ─── Agregar precio_unitario a movimientos de ENTRADA ────────────────────────
-- La columna ya existe desde migration 003, solo actualizamos la función
-- para que fn_registrar_entrada también capture el precio del producto

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
  v_lote_id        UUID;
  v_mov_id         UUID;
  v_precio_vigente NUMERIC;
BEGIN
  -- Obtener precio vigente del producto al momento del ingreso
  SELECT COALESCE(precio_descuento, precio_unitario, 0)
  INTO v_precio_vigente
  FROM productos WHERE id = p_producto_id;

  -- Insertar o actualizar lote
  INSERT INTO lotes (producto_id, numero_lote, fecha_vencimiento, cantidad_inicial, cantidad_actual)
  VALUES (p_producto_id, p_numero_lote, p_fecha_venc, p_cantidad, p_cantidad)
  ON CONFLICT (producto_id, numero_lote) DO UPDATE
    SET cantidad_actual = lotes.cantidad_actual + EXCLUDED.cantidad_actual
  RETURNING id INTO v_lote_id;

  -- Actualizar stock total
  UPDATE productos SET stock_actual = stock_actual + p_cantidad WHERE id = p_producto_id;

  -- Registrar movimiento con precio y subtotal
  INSERT INTO movimientos (
    producto_id, lote_id, tipo, cantidad, motivo, observacion, usuario_email,
    precio_unitario, subtotal, total
  )
  VALUES (
    p_producto_id, v_lote_id, 'ENTRADA', p_cantidad, 'COMPRA', p_observacion, p_usuario_email,
    v_precio_vigente, v_precio_vigente * p_cantidad, v_precio_vigente * p_cantidad
  )
  RETURNING id INTO v_mov_id;

  RETURN v_mov_id;
END;
$$;

-- ─── Función MERMA por lote específico ────────────────────────────────────────
-- A diferencia de fn_registrar_salida (FIFO automático),
-- esta función descuenta de un lote específico elegido manualmente.
CREATE OR REPLACE FUNCTION fn_registrar_merma(
  p_producto_id   UUID,
  p_lote_id       UUID,
  p_cantidad      INTEGER,
  p_observacion   TEXT    DEFAULT NULL,
  p_usuario_email VARCHAR DEFAULT NULL
)
RETURNS UUID LANGUAGE plpgsql AS $$
DECLARE
  v_lote           RECORD;
  v_precio_vigente NUMERIC;
  v_mov_id         UUID;
BEGIN
  -- Verificar que el lote existe y pertenece al producto
  SELECT id, cantidad_actual INTO v_lote
  FROM lotes WHERE id = p_lote_id AND producto_id = p_producto_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Lote no encontrado para este producto';
  END IF;

  IF v_lote.cantidad_actual < p_cantidad THEN
    RAISE EXCEPTION 'Stock insuficiente en el lote. Disponible: %, Solicitado: %',
      v_lote.cantidad_actual, p_cantidad;
  END IF;

  -- Obtener precio vigente
  SELECT COALESCE(precio_descuento, precio_unitario, 0)
  INTO v_precio_vigente
  FROM productos WHERE id = p_producto_id;

  -- Descontar del lote específico
  UPDATE lotes SET cantidad_actual = cantidad_actual - p_cantidad WHERE id = p_lote_id;

  -- Descontar del stock total del producto
  UPDATE productos SET stock_actual = stock_actual - p_cantidad WHERE id = p_producto_id;

  -- Registrar movimiento con motivo MERMA
  INSERT INTO movimientos (
    producto_id, lote_id, tipo, cantidad, motivo, observacion, usuario_email,
    precio_unitario, subtotal, total
  )
  VALUES (
    p_producto_id, p_lote_id, 'SALIDA', p_cantidad, 'MERMA', p_observacion, p_usuario_email,
    v_precio_vigente, v_precio_vigente * p_cantidad, v_precio_vigente * p_cantidad
  )
  RETURNING id INTO v_mov_id;

  RETURN v_mov_id;
END;
$$;
