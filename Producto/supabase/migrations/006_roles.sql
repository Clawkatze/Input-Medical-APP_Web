-- =============================================================================
-- Input Medical - Migration 006: Sistema de Roles
-- =============================================================================

ALTER TABLE usuarios
  DROP CONSTRAINT IF EXISTS usuarios_rol_check;

ALTER TABLE usuarios
  ADD CONSTRAINT usuarios_rol_check
  CHECK (rol IN ('superadmin', 'admin', 'bodeguero', 'visualizador'));

ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS nombre VARCHAR(100);

UPDATE usuarios SET rol = 'superadmin' WHERE email = 'admin@inputmedical.cl';
