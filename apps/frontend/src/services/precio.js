// Formatea un número como precio en pesos chilenos
// Ej: 39000 → "$39.000"
export const formatCLP = (valor) => {
  if (valor === null || valor === undefined || valor === '' || Number(valor) === 0) return '—'
  return new Intl.NumberFormat('es-CL', {
    style:    'currency',
    currency: 'CLP',
    minimumFractionDigits: 0,
  }).format(Number(valor))
}

// Retorna el precio vigente de un producto:
// precio_descuento si existe, sino precio_unitario
export const precioVigente = (producto) => {
  if (!producto) return 0
  return Number(producto.precio_descuento) || Number(producto.precio_unitario) || 0
}

// Indica si un producto tiene descuento activo
export const tieneDescuento = (producto) => {
  return producto?.precio_descuento !== null &&
         producto?.precio_descuento !== undefined &&
         Number(producto.precio_descuento) > 0
}
