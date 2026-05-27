-- =============================================================================
-- Input Medical - Migration 002: Seed de datos de demo
-- NOTA: El Super Admin se crea automáticamente al arrancar el backend
-- =============================================================================

INSERT INTO categorias (nombre, descripcion) VALUES
  ('INSUMOS',         'Materiales desechables de uso médico'),
  ('EQUIPOS MÉDICOS', 'Dispositivos y equipamiento reutilizable'),
  ('MEDICAMENTOS',    'Fármacos y preparaciones farmacéuticas'),
  ('MOBILIARIO',      'Mobiliario clínico y hospitalario')
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO productos (codigo_barras, sku, nombre, descripcion, categoria_id, stock_actual, stock_minimo, unidad_medida, tiene_vencimiento)
SELECT '780123456789','MED-CAT-18G-001','Catéter Intravenoso 18G','Catéter periférico desechable calibre 18G.',c.id,1250,200,'unidad',TRUE
FROM categorias c WHERE c.nombre = 'INSUMOS' ON CONFLICT (sku) DO NOTHING;

INSERT INTO productos (codigo_barras, sku, nombre, descripcion, categoria_id, stock_actual, stock_minimo, unidad_medida, tiene_vencimiento)
SELECT '780123456790','MED-CAT-3L-2024','Catéter Venoso Central Triple Lumen','Catéter central de triple luz.',c.id,45,15,'unidad',TRUE
FROM categorias c WHERE c.nombre = 'INSUMOS' ON CONFLICT (sku) DO NOTHING;

INSERT INTO productos (codigo_barras, sku, nombre, descripcion, categoria_id, stock_actual, stock_minimo, unidad_medida, tiene_vencimiento)
SELECT '780123456791','MED-JER-5ML-001','Jeringas Desechables 5ml','Jeringa estéril 5ml con aguja 21G.',c.id,3200,500,'unidad',TRUE
FROM categorias c WHERE c.nombre = 'INSUMOS' ON CONFLICT (sku) DO NOTHING;

INSERT INTO productos (codigo_barras, sku, nombre, descripcion, categoria_id, stock_actual, stock_minimo, unidad_medida, tiene_vencimiento)
SELECT '780123456792','MED-INS-HUM-001','Insulina Humalog 100 UI/ml','Insulina lispro acción rápida, vial 10ml.',c.id,180,30,'vial',TRUE
FROM categorias c WHERE c.nombre = 'MEDICAMENTOS' ON CONFLICT (sku) DO NOTHING;

INSERT INTO productos (codigo_barras, sku, nombre, descripcion, categoria_id, stock_actual, stock_minimo, unidad_medida, tiene_vencimiento)
SELECT '780123456793','MED-SUT-CUR-45','Sutura Mecánica Curva 45mm','Sutura mecánica para cirugía.',c.id,8,20,'unidad',TRUE
FROM categorias c WHERE c.nombre = 'INSUMOS' ON CONFLICT (sku) DO NOTHING;

INSERT INTO lotes (producto_id, numero_lote, fecha_vencimiento, cantidad_inicial, cantidad_actual)
SELECT p.id,'LOT-240101-A','2026-12-31',1250,1250 FROM productos p WHERE p.sku='MED-CAT-18G-001'
ON CONFLICT (producto_id, numero_lote) DO NOTHING;

INSERT INTO lotes (producto_id, numero_lote, fecha_vencimiento, cantidad_inicial, cantidad_actual)
SELECT p.id,'LOT-230910-A','2025-03-01',30,20 FROM productos p WHERE p.sku='MED-CAT-3L-2024'
ON CONFLICT (producto_id, numero_lote) DO NOTHING;

INSERT INTO lotes (producto_id, numero_lote, fecha_vencimiento, cantidad_inicial, cantidad_actual)
SELECT p.id,'LOT-241201-B','2027-06-30',30,25 FROM productos p WHERE p.sku='MED-CAT-3L-2024'
ON CONFLICT (producto_id, numero_lote) DO NOTHING;

INSERT INTO lotes (producto_id, numero_lote, fecha_vencimiento, cantidad_inicial, cantidad_actual)
SELECT p.id,'LOT-230101-X','2024-04-09',8,8 FROM productos p WHERE p.sku='MED-SUT-CUR-45'
ON CONFLICT (producto_id, numero_lote) DO NOTHING;

INSERT INTO lotes (producto_id, numero_lote, fecha_vencimiento, cantidad_inicial, cantidad_actual)
SELECT p.id,'LOT-240601-A','2026-08-15',180,180 FROM productos p WHERE p.sku='MED-INS-HUM-001'
ON CONFLICT (producto_id, numero_lote) DO NOTHING;

INSERT INTO lotes (producto_id, numero_lote, fecha_vencimiento, cantidad_inicial, cantidad_actual)
SELECT p.id,'LOT-240101-A','2026-12-31',3200,3200 FROM productos p WHERE p.sku='MED-JER-5ML-001'
ON CONFLICT (producto_id, numero_lote) DO NOTHING;

INSERT INTO movimientos (producto_id, lote_id, tipo, cantidad, motivo, observacion, usuario_email)
SELECT p.id,l.id,'ENTRADA',1250,'COMPRA','Ingreso inicial','admin@inputmedical.cl'
FROM productos p JOIN lotes l ON l.producto_id=p.id AND l.numero_lote='LOT-240101-A'
WHERE p.sku='MED-CAT-18G-001';

INSERT INTO movimientos (producto_id, lote_id, tipo, cantidad, motivo, observacion, usuario_email)
SELECT p.id,l.id,'ENTRADA',3200,'COMPRA','Ingreso inicial','admin@inputmedical.cl'
FROM productos p JOIN lotes l ON l.producto_id=p.id AND l.numero_lote='LOT-240101-A'
WHERE p.sku='MED-JER-5ML-001';

INSERT INTO movimientos (producto_id, lote_id, tipo, cantidad, motivo, observacion, usuario_email)
SELECT p.id,l.id,'SALIDA',10,'VENTA','Hospital Clínico San Borja','admin@inputmedical.cl'
FROM productos p JOIN lotes l ON l.producto_id=p.id AND l.numero_lote='LOT-230910-A'
WHERE p.sku='MED-CAT-3L-2024';
