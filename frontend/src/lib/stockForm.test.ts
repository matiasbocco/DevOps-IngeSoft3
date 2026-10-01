import { describe, it, expect } from 'vitest'
import { validarStockForm } from './stockForm'

describe('validarStockForm', () => {
  it.each([
    { form: { nombre: '', cantidad: '5', ubicacion: 'Deposito A', categoria: '' }, caso: 'nombre vacío' },
    { form: { nombre: '   ', cantidad: '5', ubicacion: 'Deposito A', categoria: '' }, caso: 'nombre solo espacios' },
    { form: { nombre: 'Item', cantidad: '5', ubicacion: '', categoria: '' }, caso: 'ubicación vacía' },
    { form: { nombre: 'Item', cantidad: '-1', ubicacion: 'Deposito A', categoria: '' }, caso: 'cantidad negativa' },
    { form: { nombre: 'Item', cantidad: '0', ubicacion: 'Deposito A', categoria: '' }, caso: 'cantidad cero' },
    { form: { nombre: 'Item', cantidad: 'abc', ubicacion: 'Deposito A', categoria: '' }, caso: 'cantidad no numérica' },
  ])('devuelve valido:false — $caso', ({ form }) => {
    expect(validarStockForm(form).valido).toBe(false)
  })

  it('devuelve el mensaje de error correcto cuando la cantidad es inválida', () => {
    const result = validarStockForm({ nombre: 'Monitor', cantidad: '0', ubicacion: 'Deposito A', categoria: '' })
    expect(result.valido).toBe(false)
    expect(result.error).toBe('La cantidad debe ser un número mayor o igual a 1.')
  })

  it('devuelve valido:true para un formulario completo y correcto', () => {
    const result = validarStockForm({ nombre: 'Monitor', cantidad: '3', ubicacion: 'Deposito B', categoria: 'PC' })
    expect(result.valido).toBe(true)
    expect(result.error).toBeUndefined()
  })
})
