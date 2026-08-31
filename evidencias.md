# Evidencias — TP1

Las cuatro capturas marcadas 📸 en la guía, cada una tomada en el momento en que ocurrió el hecho. Tres de las cuatro son irrepetibles: el aviso de conflicto y los marcadores dejan de existir en cuanto el conflicto se resuelve, y la release solo se publica una vez.

## 1. Push directo a main rechazado

![push directo rechazado](img/Captura%20de%20pantalla%202026-08-19%20162740.png)

Ventana real de terminal, con main ya protegida. Se hizo un commit local (142e15b) y se intentó git push. El objeto viajó —se ven el Enumerating objects y el Writing objects— y el rechazo llegó del lado del servidor:

```
remote: error: GH006: Protected branch update failed for refs/heads/main.
remote: - Changes must be made through a pull request.
 ! [remote rejected] main -> main (protected branch hook declined)
```

Lo importante no es que rechazó: es a quién rechazó. El que empujó es el dueño del repositorio. La protección se creó con *Do not allow bypassing the above settings* (enforce_admins: true), así que la regla lo alcanza igual. Una protección que el administrador puede saltear no protege nada: protege mientras nadie tenga apuro.

Después de la captura el commit local se descartó con `git reset --hard HEAD~1`; nunca existió en el remoto.

## 2. El PR de la rama B no se puede mergear: conflicto

![comparando cambios - can't automatically merge](img/Captura%20de%20pantalla%202026-08-19%20164414.png)

![aviso de conflicto en el PR](img/Captura%20de%20pantalla%202026-08-19%20164522.png)

Pull Request #3 (feature/titulo-b → main), inmediatamente después de mergear el PR #2 (feature/titulo-a). Se ven el badge rojo **Can't automatically merge** al comparar las ramas, y el cartel **This branch has conflicts that must be resolved** con README.md como único archivo afectado, y el botón Merge pull request deshabilitado.

El detalle que vale la pena mirar: hasta un minuto antes, este mismo PR figuraba como mergeable. Las dos ramas habían nacido del mismo commit de main (301f094) y reescribieron la misma línea, pero mientras ninguna estaba integrada no había nada que chocara. El conflicto no nace cuando se escribe el cambio: nace cuando se lo intenta integrar contra un main que ya se movió.

## 3. Los marcadores del conflicto

![marcadores del conflicto](img/Captura%20de%20pantalla%202026-08-19%20164644.png)

Editor de conflictos de GitHub (/pull/3/conflicts), antes de tocar nada. Ahí están las tres fronteras que deja Git cuando no puede decidir:

```
<<<<<<< matiasbocco-patch-1   (Current change)
git clone <url-del-repo># ingsoft3-tp01
=======
git clone <[url-del-repo](https://github.com/matiasbocco/ingsoft3-tp01)># ingsoft3-tp01
>>>>>>> main               (Incoming change)
```

Arriba de `=======` está la versión de la rama actual; abajo, la que ya está en main. Arriba a la derecha se lee **1 conflict** y el botón Mark as resolved está deshabilitado: GitHub no deja marcar el archivo como resuelto mientras quede un marcador.

Y lo que no está en conflicto es igual de informativo: las líneas que no fueron tocadas por ambas ramas aparecen limpias. Ninguna de las dos ramas las tocó, así que Git las fusionó solo, sin preguntar. El conflicto es quirúrgico: cae sobre la línea disputada, no sobre el archivo entero.

Esta captura es la más frágil de las cuatro, porque el paso inmediatamente siguiente es borrar esos marcadores.

## 4. La release v1.0.0 publicada

![release v1.0.0 publicada](img/Captura%20de%20pantalla%202026-08-19%20165545.png)

Release v1.0.0 con el badge **Latest**, apuntando al tag v1.0.0 y al commit aada61e — la punta de main después de mergear los PRs. Las notas dicen qué incluye la versión escritas para que las lea una persona.

El tag se creó anotado desde la máquina (`git tag -a v1.0.0 -m "..." + git push origin v1.0.0`) y la release se publicó sobre ese tag ya existente. Un tag anotado es un objeto de Git con autor, fecha y mensaje propios; un tag liviano sería solo un puntero sin metadatos. Para marcar una entrega, el anotado es el que corresponde.

---

# Evidencias — TP2

## 1. Sistema arriba: los tres contenedores corriendo

![sistema arriba](img/Captura%20de%20pantalla%202026-08-20%20163538.png)


`docker compose up --build` terminó sin errores. Los tres servicios — `db`, `backend`, `frontend` — aparecen como `Started`/`Healthy`. El frontend responde en `http://localhost:3000` con la pantalla inicial del inventario y el mensaje "No hay items." — señal de que el backend también está up y la tabla fue creada por `EnsureCreated`.

![sistema listo](img/Captura%20de%20pantalla%202026-08-20%20170325.png)
Listo para cargar items

## 2. Item creado: POST /api/items/stock → 201

![item creado](img/Captura%20de%20pantalla%202026-08-20%20170425.png)

Se cargó un item nuevo desde el formulario (nombre, cantidad, ubicación, categoría). El backend devolvió 201 y el item apareció en la tabla del frontend. La columna Cantidad muestra el valor ingresado.

## 3. Suma de stock: segundo POST con mismo nombre+ubicación → 200

![suma de stock](img/Captura%20de%20pantalla%202026-08-20%20170617.png)


Se volvió a cargar el mismo nombre y ubicación con una cantidad diferente. El backend detectó el item existente, sumó las cantidades y devolvió 200 con el item actualizado. La tabla refleja la cantidad acumulada — este es el comportamiento central del endpoint `/api/items/stock`.


## 4. Borrado con down -v

![borrado con down -v](img/Captura%20de%20pantalla%202026-08-20%20170804.png)

Se corrió `docker compose down -v`. El volumen `ingsoft3-tp01_pgdata` fue eliminado junto con los contenedores. En el siguiente `up`, el frontend volvió a mostrar "No hay items." — la base arrancó vacía. Esto confirma que el único estado persistente está en el volumen: sin él, la app es completamente efímera.

## 5. Comparación de tamaños: SDK vs imagen final

![tamaños de imágenes](img/Captura%20de%20pantalla%202026-08-20%20171210.png)

`docker images` mostrando las imágenes generadas. La imagen de build (sdk:8.0) pesa significativamente más que la imagen final de runtime (aspnet:8.0). El multi-stage hace que la imagen que se despliega solo contenga el binario publicado y el runtime, sin el SDK, el código fuente ni la caché de paquetes.

## 6. Imágenes publicadas en ghcr.io

![imágenes publicadas](img/Captura%20de%20pantalla%202026-08-20%20184541.png)

![docker pull sin login](img/Captura%20de%20pantalla%202026-08-20%20184553.png)

Las imágenes `ghcr.io/matiasbocco/ingsoft3-tp01-backend:v0.1.0` y `ghcr.io/matiasbocco/ingsoft3-tp01-frontend:v0.1.0` publicadas en GitHub Container Registry con visibilidad pública. La segunda captura muestra `docker pull` sin estar logueado — confirma que cualquiera puede bajar la imagen sin credenciales, que es el requisito para poder usar `docker-compose.registry.yml` sin configuración extra.
