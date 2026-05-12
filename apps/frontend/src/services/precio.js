// Formatea un número como precio en pesos chilenos
// Ej: 39000 → "$39.000"
export const formatCLP = (valor) => {
  if (valor === null || valor === undefined || valor === '') return '—'
  return new Intl.NumberFormat('es-CL', {
    style:    'currency',
    currency: 'CLP',
    minimumFractionDigits: 0,
  }).format(Number(valor))
}

// Calcula el total de una venta
// precio * cantidad - descuento aplicado
export const calcularTotal = ({ precio_unitario, cantidad, descuento_porcentaje, descuento_monto }) => {
  const subtotal        = (Number(precio_unitario) || 0) * (Number(cantidad) || 0)
  const descPorcentaje  = subtotal * ((Number(descuento_porcentaje) || 0) / 100)
  const descMonto       = Number(descuento_monto) || 0
  // Se aplica el mayor de los dos descuentos
  const descuentoFinal  = Math.max(descPorcentaje, descMonto)
  return {
    subtotal,
    descuento: descuentoFinal,
    total:     Math.max(0, subtotal - descuentoFinal),
  }
}
