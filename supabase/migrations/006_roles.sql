-- =============================================================================
-- Input Medical - Migration 006: Sistema de Roles
-- =============================================================================

-- ─── Actualizar columna rol con los 4 roles definidos ────────────────────────
ALTER TABLE usuarios
  DROP CONSTRAINT IF EXISTS usuarios_rol_check;

ALTER TABLE usuarios
  ADD CONSTRAINT usuarios_rol_check
  CHECK (rol IN ('superadmin', 'admin', 'bodeguero', 'visualizador'));

-- Actualizar el usuario admin del seed a superadmin
UPDATE usuarios SET rol = 'superadmin' WHERE email = 'admin@inputmedical.cl';

-- ─── Agregar campo nombre si no existe ───────────────────────────────────────
ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS nombre VARCHAR(100);
