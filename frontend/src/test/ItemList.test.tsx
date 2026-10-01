import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import ItemList from '../components/ItemList'
import { Item } from '../types'

const mockItems: Item[] = [
  { id: 1, nombre: 'Teclado', cantidad: 10, ubicacion: 'Deposito A', categoria: 'Perifericos' },
  { id: 2, nombre: 'Mouse', cantidad: 5, ubicacion: 'Deposito B', categoria: 'Perifericos' },
]

describe('ItemList', () => {
  beforeEach(() => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => mockItems,
    } as Response)
  })

  it('renders a list of items', async () => {
    render(<ItemList categoria="" refreshKey={0} />)

    expect(await screen.findByText('Teclado')).toBeInTheDocument()
    expect(screen.getByText('Mouse')).toBeInTheDocument()
    expect(screen.getByText('Deposito A')).toBeInTheDocument()
    expect(screen.getByText('Deposito B')).toBeInTheDocument()
  })

  it('renders table headers', async () => {
    render(<ItemList categoria="" refreshKey={0} />)

    expect(await screen.findByText('Nombre')).toBeInTheDocument()
    expect(screen.getByText('Cantidad')).toBeInTheDocument()
    expect(screen.getByText('Ubicación')).toBeInTheDocument()
    expect(screen.getByText('Categoría')).toBeInTheDocument()
  })

  it('arma la URL con el query param de categoría cuando categoria tiene valor', async () => {
    render(<ItemList categoria="Perifericos" refreshKey={0} />)

    await screen.findByText('Teclado')

    expect(fetch).toHaveBeenCalledWith('/api/items?categoria=Perifericos')
  })
})
