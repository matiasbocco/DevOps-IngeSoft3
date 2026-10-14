import { expect, test } from '@playwright/test'

// e2e: un navegador real usa la app de QA completa (front → nginx → api → base).
const UBICACION = 'E2E'

// El botón Eliminar pide confirmación con confirm(): la aceptamos como lo haría el usuario.
test.beforeEach(async ({ page }) => {
  page.on('dialog', dialog => dialog.accept())
})

async function cargarStock (page, { nombre, cantidad, ubicacion = UBICACION }) {
  await page.getByLabel('Nombre').fill(nombre)
  await page.getByLabel('Cantidad').fill(String(cantidad))
  await page.getByLabel('Ubicación').fill(ubicacion)
  await page.getByRole('button', { name: 'Agregar / Actualizar Stock' }).click()
}

test('crear un item lo muestra en la lista, y eliminarlo lo saca', async ({ page }) => {
  await page.goto('/')
  const nombre = `e2e ${Date.now()}`                          // único: no choca con otra corrida

  await cargarStock(page, { nombre, cantidad: 4 })
  await expect(page.getByText('Item creado correctamente.')).toBeVisible()
  await expect(page.getByRole('cell', { name: nombre, exact: true })).toBeVisible()

  await page.getByRole('button', { name: `Eliminar ${nombre}` }).click()
  await expect(page.getByRole('cell', { name: nombre, exact: true })).toHaveCount(0)
})

test('un nombre en blanco muestra el error y no crea nada', async ({ page }) => {
  await page.goto('/')
  const ubicacion = `e2e ${Date.now()} invalido`              // única, para buscarla después

  await cargarStock(page, { nombre: '   ', cantidad: 1, ubicacion })
  await expect(page.getByRole('alert')).toHaveText('El nombre es obligatorio.')   // el usuario ve el error…
  await expect(page.getByRole('cell', { name: ubicacion, exact: true })).toHaveCount(0)   // …y no se creó nada
})

// Elegido por mí: el flujo de todos los días es registrar stock que entra de un item que ya
// existe. Si no suma, el inventario miente y es lo primero que me reportarían.
test('registrar stock dos veces del mismo item suma la cantidad en la lista', async ({ page }) => {
  await page.goto('/')
  const nombre = `e2e ${Date.now()} suma`

  await cargarStock(page, { nombre, cantidad: 2 })
  await expect(page.getByText('Item creado correctamente.')).toBeVisible()
  await cargarStock(page, { nombre, cantidad: 3 })
  await expect(page.getByText('Stock actualizado correctamente.')).toBeVisible()

  const fila = page.getByRole('row').filter({ has: page.getByRole('cell', { name: nombre, exact: true }) })
  await expect(fila.getByRole('cell').nth(1)).toHaveText('5')   // 2 + 3

  await page.getByRole('button', { name: `Eliminar ${nombre}` }).click()
  await expect(page.getByRole('cell', { name: nombre, exact: true })).toHaveCount(0)
})
