import { expect, test } from '@playwright/test'

// Integración amplia: pedidos HTTP a la api de QA ya desplegada, con su Postgres de verdad.
// Sin navegador y sin dobles. La api tiene su propia dirección (no es la del front).
const API = process.env.API_BASE_URL || 'http://localhost:8080'
const UBICACION = 'Integracion'

async function listar (request) {
  const r = await request.get(`${API}/api/items`)
  expect(r.status()).toBe(200)
  return await r.json()
}

test('el alta guarda en la base de verdad, y el borrado la saca', async ({ request }) => {
  const nombre = `api ${Date.now()}`                         // único: no choca con otra corrida
  const alta = await request.post(`${API}/api/items/stock`, {
    data: { nombre, cantidad: 3, ubicacion: UBICACION, categoria: 'test' },
  })
  expect(alta.status()).toBe(201)
  const creado = await alta.json()

  const lista = await listar(request)                        // lo devuelve la BASE, no un doble
  expect(lista.some(i => i.nombre === nombre)).toBe(true)

  const borrado = await request.delete(`${API}/api/items/${creado.id}`)
  expect(borrado.status()).toBe(204)

  const despues = await listar(request)                      // y el borrado, comprobado
  expect(despues.some(i => i.nombre === nombre)).toBe(false)
})

test('un nombre vacío lo rechaza la api, y no crea nada', async ({ request }) => {
  const antes = await listar(request)

  const alta = await request.post(`${API}/api/items/stock`, {
    data: { nombre: '', cantidad: 1, ubicacion: UBICACION, categoria: 'test' },
  })
  expect(alta.status()).toBe(400)                            // el contrato del error

  const despues = await listar(request)
  expect(despues.length).toBe(antes.length)                  // y de verdad no se creó nada
})

// Elegida por mí: registrar stock de un item que ya existe SUMA la cantidad. Es la regla
// central del inventario y pasa por la base (busca por nombre + ubicación y actualiza).
test('registrar stock de un item existente suma la cantidad', async ({ request }) => {
  const nombre = `api ${Date.now()} suma`
  const primera = await request.post(`${API}/api/items/stock`, {
    data: { nombre, cantidad: 2, ubicacion: UBICACION, categoria: 'test' },
  })
  expect(primera.status()).toBe(201)
  const creado = await primera.json()

  const segunda = await request.post(`${API}/api/items/stock`, {
    data: { nombre, cantidad: 3, ubicacion: UBICACION, categoria: 'test' },
  })
  expect(segunda.status()).toBe(200)                         // «actualizado», no «creado»

  const leido = await request.get(`${API}/api/items/${creado.id}`)
  expect(leido.status()).toBe(200)
  expect((await leido.json()).cantidad).toBe(5)              // 2 + 3, guardado en la base

  const borrado = await request.delete(`${API}/api/items/${creado.id}`)
  expect(borrado.status()).toBe(204)
  const despues = await request.get(`${API}/api/items/${creado.id}`)
  expect(despues.status()).toBe(404)                         // limpieza comprobada
})
