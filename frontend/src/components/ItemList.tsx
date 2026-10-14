import { useEffect, useState } from 'react'
import { Item } from '../types'

interface Props {
  categoria: string
  refreshKey: number
}

export default function ItemList({ categoria, refreshKey }: Props) {
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)

    const url = categoria
      ? `/api/items?categoria=${encodeURIComponent(categoria)}`
      : '/api/items'

    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json() as Promise<Item[]>
      })
      .then((data) => {
        setItems(data)
        setLoading(false)
      })
      .catch((err: Error) => {
        setError(err.message)
        setLoading(false)
      })
  }, [categoria, refreshKey])

  const handleDelete = async (id: number) => {
    if (!confirm('¿Eliminar este item?')) return
    const res = await fetch(`/api/items/${id}`, { method: 'DELETE' })
    if (res.ok) {
      setItems((prev) => prev.filter((i) => i.id !== id))
    } else {
      alert('Error al eliminar el item')
    }
  }

  if (loading) return <p>Cargando...</p>
  if (error) return <p style={{ color: 'red' }}>Error: {error}</p>
  if (items.length === 0) return <p>No hay items.</p>

  return (
    <table border={1} cellPadding={8} style={{ borderCollapse: 'collapse', width: '100%' }}>
      <thead>
        <tr>
          <th>Nombre</th>
          <th>Cantidad</th>
          <th>Ubicación</th>
          <th>Categoría</th>
          <th>Acciones</th>
        </tr>
      </thead>
      <tbody>
        {items.map((item) => (
          <tr key={item.id}>
            <td>{item.nombre}</td>
            <td>{item.cantidad}</td>
            <td>{item.ubicacion}</td>
            <td>{item.categoria}</td>
            <td>
              <button onClick={() => handleDelete(item.id)} aria-label={`Eliminar ${item.nombre}`}>
                Eliminar
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
