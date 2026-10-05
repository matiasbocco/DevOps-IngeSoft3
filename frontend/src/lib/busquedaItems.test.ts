import { describe, it, expect } from 'vitest'
import {
  normalizarTexto,
  coincideConTexto,
  coincideConCategoria,
  tieneStockBajo,
  filtrarItems,
  ordenarItems,
  buscarYOrdenar,
  resumenDeResultados,
} from './busquedaItems'
import { Item } from '../types'

const items: Item[] = [
  { id: 1, nombre: 'Teclado',     cantidad: 10, ubicacion: 'Deposito A', categoria: 'Perifericos' },
  { id: 2, nombre: 'Mouse',       cantidad:  5, ubicacion: 'Deposito B', categoria: 'Perifericos' },
  { id: 3, nombre: 'Monitor',     cantidad:  3, ubicacion: 'Deposito A', categoria: 'Pantallas'   },
  { id: 4, nombre: 'Auriculares', cantidad:  0, ubicacion: 'Deposito C', categoria: 'Audio'       },
]

describe('normalizarTexto', () => {
  it('convierte a minúsculas', () => {
    expect(normalizarTexto('TECLADO')).toBe('teclado')
  })

  it('elimina acentos', () => {
    expect(normalizarTexto('Ubicación')).toBe('ubicacion')
  })

  it('elimina espacios extremos', () => {
    expect(normalizarTexto('  hola  ')).toBe('hola')
  })

  it('combina minúsculas, acentos y espacios', () => {
    expect(normalizarTexto('  CANCIÓN  ')).toBe('cancion')
  })
})

describe('coincideConTexto', () => {
  it('retorna true cuando el texto coincide con el nombre', () => {
    expect(coincideConTexto(items[0], 'Teclado')).toBe(true)
  })

  it('retorna true cuando el texto coincide con la ubicacion', () => {
    expect(coincideConTexto(items[0], 'Deposito A')).toBe(true)
  })

  it('retorna false cuando el texto no coincide con nombre ni ubicacion', () => {
    expect(coincideConTexto(items[0], 'Mouse')).toBe(false)
  })

  it('retorna true cuando el texto está vacío', () => {
    expect(coincideConTexto(items[0], '')).toBe(true)
  })

  it('es case-insensitive', () => {
    expect(coincideConTexto(items[2], 'monitor')).toBe(true)
  })

  it('ignora acentos al comparar', () => {
    expect(coincideConTexto(items[0], 'deposito')).toBe(true)
  })
})

describe('coincideConCategoria', () => {
  it('retorna true cuando la categoría coincide exactamente', () => {
    expect(coincideConCategoria(items[0], 'Perifericos')).toBe(true)
  })

  it('retorna false cuando la categoría no coincide', () => {
    expect(coincideConCategoria(items[0], 'Pantallas')).toBe(false)
  })

  it('retorna true cuando categoria es cadena vacía', () => {
    expect(coincideConCategoria(items[0], '')).toBe(true)
  })

  it('retorna true cuando categoria es solo espacios', () => {
    expect(coincideConCategoria(items[0], '   ')).toBe(true)
  })

  it('es case-insensitive', () => {
    expect(coincideConCategoria(items[0], 'perifericos')).toBe(true)
  })
})

describe('tieneStockBajo', () => {
  it('retorna true cuando cantidad es 0', () => {
    expect(tieneStockBajo({ ...items[3], cantidad: 0 }, 5)).toBe(true)
  })

  it('retorna true cuando cantidad es igual al límite (5)', () => {
    expect(tieneStockBajo({ ...items[1], cantidad: 5 }, 5)).toBe(true)
  })

  it('retorna false cuando cantidad supera el límite en 1 (6)', () => {
    expect(tieneStockBajo({ ...items[1], cantidad: 6 }, 5)).toBe(false)
  })

  it('retorna false cuando cantidad es 10 con límite 5', () => {
    expect(tieneStockBajo({ ...items[0], cantidad: 10 }, 5)).toBe(false)
  })
})

describe('filtrarItems', () => {
  it('sin filtros devuelve todos los items', () => {
    expect(filtrarItems(items, {})).toHaveLength(4)
  })

  it('filtra por texto en nombre', () => {
    const result = filtrarItems(items, { texto: 'Teclado' })
    expect(result).toHaveLength(1)
    expect(result[0].nombre).toBe('Teclado')
  })

  it('filtra por texto en ubicacion', () => {
    const result = filtrarItems(items, { texto: 'Deposito A' })
    expect(result).toHaveLength(2)
  })

  it('filtra por categoría', () => {
    const result = filtrarItems(items, { categoria: 'Perifericos' })
    expect(result).toHaveLength(2)
  })

  it('con categoria vacía devuelve todos', () => {
    expect(filtrarItems(items, { categoria: '' })).toHaveLength(4)
  })

  it('filtra por stock bajo con límite 5', () => {
    const result = filtrarItems(items, { limiteStock: 5 })
    expect(result).toHaveLength(3) // Mouse(5), Monitor(3), Auriculares(0)
  })

  it('combina texto, categoría y stock bajo', () => {
    const result = filtrarItems(items, {
      texto: 'Deposito',
      categoria: 'Perifericos',
      limiteStock: 5,
    })
    expect(result).toHaveLength(1)
    expect(result[0].nombre).toBe('Mouse')
  })

  it('devuelve array vacío si ningún item coincide', () => {
    expect(filtrarItems(items, { texto: 'xyz' })).toHaveLength(0)
  })
})

describe('ordenarItems', () => {
  it('ordena por nombre ascendente', () => {
    const result = ordenarItems(items, { campo: 'nombre', direccion: 'asc' })
    expect(result.map((i) => i.nombre)).toEqual(['Auriculares', 'Monitor', 'Mouse', 'Teclado'])
  })

  it('ordena por nombre descendente', () => {
    const result = ordenarItems(items, { campo: 'nombre', direccion: 'desc' })
    expect(result.map((i) => i.nombre)).toEqual(['Teclado', 'Mouse', 'Monitor', 'Auriculares'])
  })

  it('ordena por cantidad ascendente', () => {
    const result = ordenarItems(items, { campo: 'cantidad', direccion: 'asc' })
    expect(result.map((i) => i.cantidad)).toEqual([0, 3, 5, 10])
  })

  it('ordena por cantidad descendente', () => {
    const result = ordenarItems(items, { campo: 'cantidad', direccion: 'desc' })
    expect(result.map((i) => i.cantidad)).toEqual([10, 5, 3, 0])
  })

  it('no muta el array original', () => {
    const original = items.map((i) => ({ ...i }))
    ordenarItems(items, { campo: 'nombre', direccion: 'asc' })
    expect(items).toEqual(original)
  })
})

describe('buscarYOrdenar', () => {
  it('aplica filtros y luego ordena', () => {
    const result = buscarYOrdenar(
      items,
      { categoria: 'Perifericos' },
      { campo: 'nombre', direccion: 'asc' },
    )
    expect(result.map((i) => i.nombre)).toEqual(['Mouse', 'Teclado'])
  })

  it('devuelve array vacío si no hay coincidencias', () => {
    const result = buscarYOrdenar(
      items,
      { texto: 'xyz' },
      { campo: 'nombre', direccion: 'asc' },
    )
    expect(result).toHaveLength(0)
  })
})

describe('resumenDeResultados', () => {
  it('devuelve mensaje para 0 items', () => {
    expect(resumenDeResultados([])).toBe('No se encontraron items.')
  })

  it('devuelve mensaje para 1 item', () => {
    expect(resumenDeResultados([items[0]])).toBe('1 item encontrado.')
  })

  it('devuelve mensaje para N items', () => {
    expect(resumenDeResultados(items)).toBe('4 items encontrados.')
  })
})
