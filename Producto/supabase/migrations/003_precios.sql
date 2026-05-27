-- =============================================================================
-- Input Medical - Migration 003: Precios en productos y movimientos
-- =============================================================================

ALTER TABLE productos
  ADD COLUMN IF NOT EXISTS precio_unitario NUMERIC(12,2) DEFAULT 0 CHECK (precio_unitario >= 0);

ALTER TABLE movimientos
  ADD COLUMN IF NOT EXISTS precio_unitario      NUMERIC(12,2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS descuento_porcentaje NUMERIC(5,2)  DEFAULT 0 CHECK (descuento_porcentaje BETWEEN 0 AND 100),
  ADD COLUMN IF NOT EXISTS descuento_monto      NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS subtotal             NUMERIC(12,2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS total                NUMERIC(12,2) DEFAULT NULL;

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
  p.nombre AS producto_nombre,
  p.sku    AS producto_sku,
  l.numero_lote,
  l.fecha_vencimiento
FROM movimientos m
JOIN productos p ON p.id = m.producto_id
LEFT JOIN lotes l ON l.id = m.lote_id
ORDER BY m.created_at DESC;
