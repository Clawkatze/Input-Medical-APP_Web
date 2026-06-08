-- =============================================================================
-- Input Medical - Migration 011: Tabla alertas_revisadas
-- =============================================================================

CREATE TABLE IF NOT EXISTS alertas_revisadas (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  producto_id      UUID NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
  lote_id          UUID REFERENCES lotes(id) ON DELETE SET NULL,
  fecha_vencimiento DATE,
  revisado_por     UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  fecha_revision   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_alertas_revisadas_producto
  ON alertas_revisadas (producto_id);

CREATE INDEX IF NOT EXISTS idx_alertas_revisadas_fecha
  ON alertas_revisadas (fecha_revision DESC);

-- Índice único para evitar duplicados por lote por día
CREATE UNIQUE INDEX IF NOT EXISTS idx_alertas_revisadas_lote_dia
  ON alertas_revisadas (lote_id, fecha_revision::date)
  WHERE lote_id IS NOT NULL;