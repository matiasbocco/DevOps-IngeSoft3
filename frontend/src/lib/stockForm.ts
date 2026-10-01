export interface FormInput {
  nombre: string
  cantidad: string
  ubicacion: string
  categoria?: string
}

export interface ValidacionResult {
  valido: boolean
  error?: string
}

export function validarStockForm(form: FormInput): ValidacionResult {
  if (!form.nombre.trim()) {
    return { valido: false, error: 'El nombre es obligatorio.' }
  }
  if (!form.ubicacion.trim()) {
    return { valido: false, error: 'La ubicación es obligatoria.' }
  }
  const cantidad = parseInt(form.cantidad, 10)
  if (isNaN(cantidad) || cantidad < 1) {
    return { valido: false, error: 'La cantidad debe ser un número mayor o igual a 1.' }
  }
  return { valido: true }
}
