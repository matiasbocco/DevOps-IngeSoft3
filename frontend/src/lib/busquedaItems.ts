import { Item } from '../types'

export function normalizarTexto(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
}

export function coincideConTexto(item: Item, texto: string): boolean {
  if (!texto.trim()) return true
  const norm = normalizarTexto(texto)
  return (
    normalizarTexto(item.nombre).includes(norm) ||
    normalizarTexto(item.ubicacion).includes(norm)
  )
}

export function coincideConCategoria(item: Item, categoria: string): boolean {
  if (!categoria.trim()) return true
  return normalizarTexto(item.categoria) === normalizarTexto(categoria)
}

export function tieneStockBajo(item: Item, limite: number): boolean {
  return item.cantidad <= limite
}

export interface Filtros {
  texto?: string
  categoria?: string
  limiteStock?: number
}

export interface Orden {
  campo: 'nombre' | 'cantidad'
  direccion: 'asc' | 'desc'
}

export function filtrarItems(items: Item[], filtros: Filtros): Item[] {
  return items.filter((item) => {
    if (filtros.texto !== undefined && !coincideConTexto(item, filtros.texto)) return false
    if (filtros.categoria !== undefined && !coincideConCategoria(item, filtros.categoria)) return false
    if (filtros.limiteStock !== undefined && !tieneStockBajo(item, filtros.limiteStock)) return false
    return true
  })
}

export function ordenarItems(items: Item[], orden: Orden): Item[] {
  return [...items].sort((a, b) => {
    const valA = orden.campo === 'nombre' ? a.nombre.toLowerCase() : a.cantidad
    const valB = orden.campo === 'nombre' ? b.nombre.toLowerCase() : b.cantidad
    if (valA < valB) return orden.direccion === 'asc' ? -1 : 1
    if (valA > valB) return orden.direccion === 'asc' ? 1 : -1
    return 0
  })
}

export function buscarYOrdenar(items: Item[], filtros: Filtros, orden: Orden): Item[] {
  return ordenarItems(filtrarItems(items, filtros), orden)
}

export function resumenDeResultados(items: Item[]): string {
  if (items.length === 0) return 'No se encontraron items.'
  if (items.length === 1) return '1 item encontrado.'
  return `${items.length} items encontrados.`
}
