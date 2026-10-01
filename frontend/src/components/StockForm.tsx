import { useState, FormEvent } from 'react'
import { validarStockForm } from '../lib/stockForm'

interface Props {
  onSuccess: () => void
}

interface FormState {
  nombre: string
  cantidad: string
  ubicacion: string
  categoria: string
}

export default function StockForm({ onSuccess }: Props) {
  const [form, setForm] = useState<FormState>({
    nombre: '',
    cantidad: '',
    ubicacion: '',
    categoria: '',
  })
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setStatus(null)
    setError(null)

    const validacion = validarStockForm(form)
    if (!validacion.valido) {
      setError(validacion.error ?? 'Formulario inválido.')
      return
    }

    const body = {
      nombre: form.nombre,
      cantidad: parseInt(form.cantidad, 10),
      ubicacion: form.ubicacion,
      categoria: form.categoria,
    }

    try {
      const res = await fetch('/api/items/stock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (res.status === 201) {
        setStatus('Item creado correctamente.')
      } else if (res.status === 200) {
        setStatus('Stock actualizado correctamente.')
      } else {
        const text = await res.text()
        setError(`Error ${res.status}: ${text}`)
        return
      }

      setForm({ nombre: '', cantidad: '', ubicacion: '', categoria: '' })
      onSuccess()
    } catch (err) {
      setError('Error de red al conectar con el servidor.')
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <label htmlFor="nombre">Nombre: </label>
        <input
          id="nombre"
          name="nombre"
          type="text"
          value={form.nombre}
          onChange={handleChange}
          required
        />
      </div>
      <div>
        <label htmlFor="cantidad">Cantidad: </label>
        <input
          id="cantidad"
          name="cantidad"
          type="number"
          min={1}
          value={form.cantidad}
          onChange={handleChange}
          required
        />
      </div>
      <div>
        <label htmlFor="ubicacion">Ubicación: </label>
        <input
          id="ubicacion"
          name="ubicacion"
          type="text"
          value={form.ubicacion}
          onChange={handleChange}
          required
        />
      </div>
      <div>
        <label htmlFor="categoria">Categoría: </label>
        <input
          id="categoria"
          name="categoria"
          type="text"
          value={form.categoria}
          onChange={handleChange}
        />
      </div>
      <button type="submit" style={{ marginTop: '0.5rem' }}>
        Agregar / Actualizar Stock
      </button>
      {status && <p style={{ color: 'green' }}>{status}</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}
    </form>
  )
}
