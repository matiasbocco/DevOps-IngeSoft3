import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, afterEach } from 'vitest'
import userEvent from '@testing-library/user-event'
import StockForm from '../components/StockForm'

describe('StockForm', () => {
  it('renders all required fields', () => {
    render(<StockForm onSuccess={() => {}} />)

    expect(screen.getByLabelText(/nombre/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/cantidad/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/ubicaci/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/categor/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /agregar/i })).toBeInTheDocument()
  })

  it('inputs start empty', () => {
    render(<StockForm onSuccess={() => {}} />)

    expect(screen.getByLabelText(/nombre/i)).toHaveValue('')
    expect(screen.getByLabelText(/cantidad/i)).toHaveValue(null)
    expect(screen.getByLabelText(/ubicaci/i)).toHaveValue('')
    expect(screen.getByLabelText(/categor/i)).toHaveValue('')
  })

  describe('submit', () => {
    afterEach(() => {
      vi.restoreAllMocks()
    })

    it('muestra el error de validación y NO llama a fetch si el formulario es inválido', async () => {
      const fetchMock = vi.spyOn(globalThis, 'fetch')
      const { container } = render(<StockForm onSuccess={() => {}} />)

      // fireEvent.submit bypasses HTML constraint validation (required/min)
      // para testear la capa de validación JS directamente
      fireEvent.submit(container.querySelector('form')!)

      expect(await screen.findByText('El nombre es obligatorio.')).toBeInTheDocument()
      expect(fetchMock).toHaveBeenCalledTimes(0)
    })

    it('hace POST a /api/items/stock y muestra mensaje de item creado cuando el backend responde 201', async () => {
      const user = userEvent.setup()
      const onSuccess = vi.fn()
      vi.spyOn(globalThis, 'fetch').mockResolvedValue({ status: 201 } as Response)
      render(<StockForm onSuccess={onSuccess} />)

      await user.type(screen.getByLabelText(/nombre/i), 'Monitor')
      await user.type(screen.getByLabelText(/cantidad/i), '3')
      await user.type(screen.getByLabelText(/ubicaci/i), 'Deposito A')
      await user.click(screen.getByRole('button', { name: /agregar/i }))

      expect(globalThis.fetch).toHaveBeenCalledWith('/api/items/stock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre: 'Monitor', cantidad: 3, ubicacion: 'Deposito A', categoria: '' }),
      })
      expect(await screen.findByText('Item creado correctamente.')).toBeInTheDocument()
      expect(onSuccess).toHaveBeenCalledTimes(1)
    })

    it('muestra mensaje de stock actualizado cuando el backend responde 200', async () => {
      const user = userEvent.setup()
      vi.spyOn(globalThis, 'fetch').mockResolvedValue({ status: 200 } as Response)
      render(<StockForm onSuccess={() => {}} />)

      await user.type(screen.getByLabelText(/nombre/i), 'Teclado')
      await user.type(screen.getByLabelText(/cantidad/i), '5')
      await user.type(screen.getByLabelText(/ubicaci/i), 'Deposito B')
      await user.click(screen.getByRole('button', { name: /agregar/i }))

      expect(await screen.findByText('Stock actualizado correctamente.')).toBeInTheDocument()
    })

    it('muestra el error del backend cuando la respuesta no es 200 ni 201', async () => {
      const user = userEvent.setup()
      vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        status: 400,
        text: async () => 'Nombre duplicado',
      } as unknown as Response)
      render(<StockForm onSuccess={() => {}} />)

      await user.type(screen.getByLabelText(/nombre/i), 'Monitor')
      await user.type(screen.getByLabelText(/cantidad/i), '2')
      await user.type(screen.getByLabelText(/ubicaci/i), 'Deposito C')
      await user.click(screen.getByRole('button', { name: /agregar/i }))

      expect(await screen.findByText('Error 400: Nombre duplicado')).toBeInTheDocument()
    })

    it('muestra error de red cuando fetch rechaza la promesa', async () => {
      const user = userEvent.setup()
      vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Network error'))
      render(<StockForm onSuccess={() => {}} />)

      await user.type(screen.getByLabelText(/nombre/i), 'Monitor')
      await user.type(screen.getByLabelText(/cantidad/i), '1')
      await user.type(screen.getByLabelText(/ubicaci/i), 'Deposito D')
      await user.click(screen.getByRole('button', { name: /agregar/i }))

      expect(await screen.findByText('Error de red al conectar con el servidor.')).toBeInTheDocument()
    })
  })
})
