# Enlaces del TP7

**Paquetes (públicos), con la imagen que está en PROD:**
- `ghcr.io/matiasbocco/devops-ingesoft3-backend:sha-f4b7c8bd2244d7c9d87043ba6343638eee3d057b`
- `ghcr.io/matiasbocco/devops-ingesoft3-frontend:sha-f4b7c8bd2244d7c9d87043ba6343638eee3d057b`

**Integración verde + e2e roja frenando la promoción:**
- Commit que rompió la app (el front llama a `/api/item/{id}` al eliminar): https://github.com/matiasbocco/DevOps-IngeSoft3/commit/2bc5aa3e7c027b47094e21d4a0747900f0fd1f89
- Corrida: https://github.com/matiasbocco/DevOps-IngeSoft3/actions/runs/38492894433
- Reportes (`playwright-report-integracion` en verde y `playwright-report-e2e` en rojo): https://github.com/matiasbocco/DevOps-IngeSoft3/actions/runs/38492894433#artifacts

**Corrida completa en verde hasta PROD (después del arreglo):** https://github.com/matiasbocco/DevOps-IngeSoft3/actions/runs/38494616017

**Entornos** (red interna de Fulgor): QA http://172.16.0.110:3000 (API :8080) · PROD http://172.16.0.110:3001 (API :8081)

# Enlaces del TP6

**Paquetes (públicos, `docker pull` sin login):**
- `ghcr.io/matiasbocco/devops-ingesoft3-backend:sha-960d26e36182a0b8dde422e65f555508c264f413`
- `ghcr.io/matiasbocco/devops-ingesoft3-frontend:sha-960d26e36182a0b8dde422e65f555508c264f413`

**Cadena:**
- PR con tests en verde y «Entrar al registry» salteado: https://github.com/matiasbocco/DevOps-IngeSoft3/actions/runs/38169151145/job/114557884843
- Corrida de `main` con publicar como último paso: https://github.com/matiasbocco/DevOps-IngeSoft3/actions/runs/38169490996/job/114558901439

**Entornos** (red interna de Fulgor):
- QA: http://172.16.0.110:3000 (API :8080)
- PROD: http://172.16.0.110:3001 (API :8081)

# Decisiones — TP1

## 1. Por qué Git no pudo resolver el conflicto solo

### Qué pasó

Las dos ramas (feature/titulo-a y feature/titulo-b) nacieron del mismo commit de main. Las dos cambiaron la línea 1 del README.md: una puso "versión A" y la otra puso "versión B".

Cuando mergeé primero la rama A, main pasó a tener "versión A". Después, al querer mergear la rama B, Git comparó las dos puntas contra el ancestro común y vio que las dos habían cambiado la misma línea pero de forma distinta.

Git no puede saber cuál es la correcta porque solo compara texto, no entiende significado. Entonces hace lo único que puede: marca las dos versiones en el archivo y le deja la decisión a una persona.

La prueba de que el criterio es "misma línea" y no "mismo archivo" está en la captura 3: la sección de Instalación, que estaba en el mismo archivo, se fusionó sola porque ninguna de las dos ramas la había tocado.

### Cómo se podría haber evitado

- **Integrar más seguido.** Si la rama B se hubiera creado después de mergear la rama A, habría partido de un main que ya tenía "versión A" y no habría conflicto. Ramas cortas = conflictos chicos.
- **No tocar la misma línea.** Si cada rama toca una zona distinta del archivo, Git fusiona sin preguntar.
- **Ponerse de acuerdo antes.** El conflicto de Git es el síntoma; la causa real es que dos personas tomaron decisiones incompatibles sin hablar.

En este TP el conflicto se fabricó a propósito para practicarlo en un entorno controlado.

## 2. Problemas que encontré y cómo los solucioné

### a) El README no tenía salto de línea final

Cuando agregué la sección de instalación, el diff mostraba `\ No newline at end of file` y la sección nueva quedaba pegada al título. En Markdown eso rompe el encabezado.

Lo vi leyendo el diff antes de mergear. Lo arreglé con un segundo commit en la misma rama separando bien las líneas.

### b) GitHub tarda en detectar el conflicto

Justo después de mergear el PR #2, el PR #3 todavía aparecía como mergeable. GitHub calcula la mergeabilidad en background y tarda unos segundos. Tuve que esperar y refrescar antes de sacar la captura del conflicto.

### c) El push rechazado (que no es un error)

`git push` devolviendo `! [remote rejected]` en rojo parece un error, pero es el resultado buscado: es la prueba de que la protección funciona. El commit local quedó descartado con `git reset --hard HEAD~1`.

### d) Las aprobaciones obligatorias en un TP individual

La protección se creó con 0 aprobaciones requeridas. GitHub no permite que el autor de un PR apruebe su propio PR, así que en un TP individual pedir 1 aprobación deja los PRs imposibles de mergear. En un equipo real ese número iría en 1 o más; acá va en 0 y la revisión la hago yo leyendo el diff.

## TP2 — Contenedores

### Qué app elegí y por qué

Elegí un inventario básico (backend .NET 8 Minimal API + EF Core + PostgreSQL, frontend React/Vite). Los criterios de la guía pedían una app que buildee localmente, tenga tests, sea comprensible y sea chica. Esta los cumple todos: el backend compila con `dotnet publish` sin dependencias externas al `.csproj`, tiene tests xUnit sobre la lógica de upsert y tests Vitest sobre los componentes, el dominio (item con nombre/cantidad/ubicación/categoría) es trivial de entender, y el total de código propio es menos de 300 líneas.

### Decisiones de contenerización

**Imágenes base elegidas:**
- Backend build: `mcr.microsoft.com/dotnet/sdk:8.0` — incluye el SDK completo para compilar. Runtime: `mcr.microsoft.com/dotnet/aspnet:8.0` — solo el runtime, sin SDK ni herramientas de build.
- Frontend build: `node:20-alpine` — Node LTS en variante Alpine para minimizar tamaño. Serve: `nginx:alpine` — servidor estático liviano; el frontend es un bundle estático después del build.
- Base de datos: `postgres:16-alpine` — PostgreSQL 16 en Alpine, imagen oficial.

**Por qué multi-stage:**
El stage de build del backend pesa ~900 MB (SDK + fuentes + cache de restore). El stage de runtime pesa ~220 MB. Sin multi-stage, cada deploy arrastraría el SDK completo. Con multi-stage, la imagen final solo contiene el binario publicado y el runtime. Lo mismo en el frontend: `node_modules` durante el build suma cientos de MB que no tienen que estar en producción; nginx sirve solo el `dist/`.

**Qué persiste en el volumen y qué no:**
El volumen `pgdata` persiste los datos de PostgreSQL en `/var/lib/postgresql/data`. Todo lo demás es efímero: los contenedores de backend y frontend son stateless y se pueden recrear sin perder datos. Si se hace `docker compose down` (sin `-v`) los datos sobreviven. Si se agrega `-v` el volumen se borra y la base queda vacía en el próximo `up`.

### Problemas encontrados

El principal problema fue que `npm ci` fallaba en el build del frontend porque no había `package-lock.json` en el repositorio (el agente generó `package.json` pero no corrió `npm install`). El error en Docker era claro: `npm ci` requiere un lockfile existente. Lo resolví corriendo `npm install` en `frontend/` localmente para generar el `package-lock.json` y commitearlo junto con el resto.

Otro problema: la tabla `Items` no se creaba aunque EF Core decía "no migrations were applied". Las migraciones fueron generadas manualmente por el agente y no quedaron registradas en el assembly compilado. La solución fue reemplazar `db.Database.Migrate()` por `db.Database.EnsureCreated()`, que crea el schema directamente del modelo sin depender de archivos de migración.

### Declaración de uso de IA

La estructura inicial del proyecto (archivos `.csproj`, `Program.cs`, `Dockerfile`, `docker-compose.yml`, componentes React) fue generada con asistencia de Claude Code. El código fue revisado, los errores de contenerización fueron diagnosticados y corregidos por mí corriendo la app de punta a punta: levanté el stack con `docker compose up`, verifiqué cada endpoint desde el browser y con `curl`, y confirmé la persistencia y el borrado del volumen manualmente.


## TP3 — Planificación y trazabilidad

### Duración del sprint

Elegí sprints de **1 semana**. Justificación: el reglamento de la materia está pensado para que
cada TP tome aproximadamente una semana si se viene al día, así que alinear el sprint a ese ritmo
me permite usar cada entrega semanal de la cursada como cierre natural del sprint, sin inventar un
calendario paralelo.

### Límite de trabajo en progreso

Configuré el límite en **2** para la columna In Progress. Sale de la regla de arranque de la guía:
cantidad de personas + 1 (trabajando solo, 1 + 1 = 2). El "+1" me da margen para no quedar
completamente trabado si algo queda esperando una revisión o una respuesta externa, sin llegar a
que el límite deje de cumplir su función. Si en la práctica nunca llego a alcanzarlo, es señal de
que puedo bajarlo a 1; si lo alcanzo todo el tiempo y me frena, lo subiría.

### Diagnóstico de la historia mal escrita

La historia `"Como desarrollador quiero crear la tabla usuarios"` es una **tarea técnica
disfrazada de historia de usuario**. El problema no es de redacción sino de fondo: crear una tabla
en la base de datos es un paso de implementación interno, no algo que un usuario final "quiere" o
experimenta — nadie usando la app pide que exista una tabla, lo que pediría es algo observable
(por ejemplo, poder iniciar sesión). La reescribiría separando los dos niveles: una historia real
con beneficio para el usuario (`"Como usuario quiero poder iniciar sesión para acceder a mi
inventario personal"`), y la creación de la tabla como una de las **tareas técnicas** colgando de
esa historia, no como historia en sí misma.

### Problemas encontrados y cómo los resolví

- **El primer PR de trazabilidad no cerró el issue**: creé el archivo `.github/workflows/ci.yml`
  y mergeé el PR sin completar la descripción con `Closes #9` (quedó "No description provided").
  Como GitHub solo evalúa las palabras clave de cierre en el momento del merge (no las revisa
  retroactivamente si editás la descripción después), tuve que abrir un segundo PR chico
  (un comentario aclaratorio en el mismo archivo) con la descripción correcta esta vez, y ese sí
  cerró la tarea #9 automáticamente.
- **Renombré el repositorio** de `ingsoft3-tp01` a `DevOps-IngeSoft3` durante el TP3; GitHub
  redirige automáticamente las URLs viejas al nombre nuevo, así que no generó ningún problema real
  más allá de la confusión inicial al verificar los links.

### Declaración de uso de IA

Usé Claude para señalarme el error del primer PR sin `Closes #N`. El diagnóstico de la historia mal escrita lo pensé y respondí yo mismo
antes de que Claude lo confirmara. Y use claude para la redaccion de estos textos.


## TP4 — CI: Pipelines as Code

### Estructura del pipeline

El workflow tiene **dos jobs en paralelo**: `build-backend` y `build-frontend`, uno por cada
Dockerfile del TP2. Los separé porque corren en máquinas independientes y no dependen entre sí —
no hay razón para esperar a que termine uno para empezar el otro. Cada job dispara con
`pull_request` (verificación antes del merge, la corrida que realmente importa) y `push` a `main`
(la que deja el estado del badge y el cache disponible para el próximo PR).

### Qué cachea y qué pasa si desaparece

Se cachean las **capas de la imagen Docker** de cada Dockerfile — específicamente las que no
cambian entre corridas (por ejemplo, la capa de `dotnet restore` si no cambió ningún `.csproj`, o
`npm ci` si no cambió el `package-lock.json`). Cada job usa su propio `scope` (`backend` /
`frontend`) para no pisarse el cache entre sí. En la segunda corrida del mismo PR se vio
`backend` con 44% cached y `frontend` con 40% cached, bajando de ~20s a 2-3s de duración.

El cache es una optimización, no una dependencia: si GitHub lo desaloja (tiene límite de tamaño y
puede desaparecer en cualquier momento), el pipeline vuelve a construir todo desde cero — más
lento, pero funciona exactamente igual. Si el pipeline fallara sin cache, no seria un cache: sería
una dependencia escondida que nunca debí tener.

### Por qué construye con el Dockerfile en vez de compilar por su cuenta

El pipeline no tiene ninguna línea de `dotnet` ni `npm` — usa `docker/build-push-action` apuntando
al mismo Dockerfile del TP2. Si el workflow compilara por su cuenta, tendría dos definiciones de
build (una en el YAML, otra en el Dockerfile) que tarde o temprano divergen, y estaría verificando
una compilación distinta de la que después se despliega. Con este enfoque, lo que el pipeline
construye es exactamente lo mismo que se va a desplegar más adelante.

### Problemas encontrados y cómo los resolví

- **El editor web de GitHub rompió el formato del YAML**: al pegar el workflow completo directo en
  el editor de texto de github.com, los saltos de línea se colapsaron y el archivo quedó como una
  sola línea gigante. El resultado fue una corrida que fallaba en 0 segundos con "This workflow
  graph cannot be shown" — ni siquiera llegaba a interpretar el YAML. Lo resolví editando el
  archivo en VS Code (donde el pegado preserva la indentación) y subiéndolo por Git en vez de por
  el editor web.

- **El gate bloqueó el merge como se esperaba**: se rompió a propósito `build-backend` agregando
  `using NoExiste;` en `Program.cs`. El PR quedó con "Merging is blocked" y el check `build-backend` en rojo
  (Required), mientras `build-frontend` seguía en verde — confirmando que un solo check requerido
  en rojo alcanza para frenar el merge. Saqué la línea rota, pusheé el fix, y el pipeline volvió a
  verde solo, destrabando el merge.


### Declaración de uso de IA

Usé Claude para guiarme paso a paso por la escritura del workflow (los dos jobs, cache con scope
separado, el gate en branch protection), por si no entiendia la explicacion del repo del TP, entonces trabajaba con ambos en paralelo para asegurarme. Y para diagnosticar los errores que fueron apareciendo
(el YAML roto por el editor web, el conflicto del README). 
Verifiqué y realicé cada paso yo mismo: corrí el `docker build` local antes de subir el código roto, confirmé visualmente el bloqueo del merge en GitHub, y confirmé el porcentaje de cache reutilizado en la segunda corrida.


## TP5 — Testing y Calidad

### Umbral elegido y por qué

**Backend: 95%** con coverlet.msbuild. Lo dejé alto porque después del refactor la lógica real,
antes escondida en Program.cs, quedó chica y bien testeada — mi cobertura real mide 100% sobre
esas clases. Si agrego lógica nueva sin testear, el número baja del 95% enseguida y me entero.

**Frontend: 70%** líneas/branch con vitest/v8. Acá lo puse más bajo a propósito: mi medición real
dio 95.57%/88.88%, pero dejé margen porque el frontend es mayormente UI, componentes React con
bastantes callbacks de JSX que no vale la pena perseguir al 100%. No le puse umbral a functions
por el mismo motivo.

### Qué excluí de la cuenta

**Backend:** Program.cs, que contiene solo el cableado de DI y rutas sin reglas de negocio, y las
migraciones de EF Core — con [ExcludeFromCodeCoverage] y /p:Exclude.

**Frontend:** src/main.tsx, el bootstrap de la app, y los archivos de test, vía include/exclude
en vite.config.ts.

### Rama sin cubrir (branch coverage)

ItemList.tsx línea 19 arma la URL con un ternario: categoria ? url-con-query : url-simple. Es
un if/else con otra sintaxis — dos caminos posibles. Los tests existentes siempre renderizaban con
categoria="", así que solo se ejecutaba el camino sin categoría; el del filtro nunca se probó,
por eso el reporte lo marcaba naranja. La entrada que lo recorre es renderizar con
categoria="Perifericos" y chequear que el fetch se llama con /api/items?categoria=Perifericos.
Lo agregué porque es barato y cubre el filtro por categoría, que el usuario realmente usa.

### Problemas encontrados y cómo los resolví

- **package-lock.json desincronizado:** después de agregar @vitest/coverage-v8 al
  package.json a mano, npm ci fallaba en Docker/CI. Se arregla corriendo npm install
  localmente y commiteando el lockfile actualizado.

- **EBUSY: resource busy or locked, rmdir /app/coverage en CI:** vitest borra y recrea la
  carpeta coverage/ antes de cada corrida, pero en Docker esa carpeta es el punto de montaje del
  volumen y no se puede borrar un mountpoint desde adentro. Se soluciona con clean: false en la
  config de coverage de vite.config.ts.

### Declaración de uso de IA

El refactor de StockValidator, StockService y validarStockForm, junto con los tests, los armó
Claude Code bajo instrucciones mías; yo revisé cada diff antes de aplicarlo y confirmé en GitHub que
los checks quedaban en verde antes de mergear cada PR.






## TP6 — Entrega continua: environments, aprobaciones y deployment patterns

### Dónde despliego: plan C (self-hosted runner + docker compose)
Elegí correr QA y PROD en Torvalds (172.16.0.110), un servidor de la red de mi trabajo que me prestaron
para este proyecto, en vez de Render/Neon. Es lo que voy a tener que hacer con proyectos reales
del trabajo, y ya tengo otro proyecto personal en Railway: preferí el camino más difícil pero más útil.
Cumplo los cinco puntos del contrato: dos entornos con sus puertos (QA 8080/3000, PROD 8081/3001), una base
por entorno (volúmenes separados: un item creado solo en PROD no aparece en QA), contenedores de mis
Dockerfiles, deploy disparado por Actions y PROD detrás de la aprobación.


### Por qué se publica solo con verde
Si publicara con tests en rojo, el registry dejaría de significar esto pasó la verificación.
Lo garantizan tres cosas juntas: nada entra a `main` sin verde, solo `main` publica, y publicar
es el último paso del job que testea. Un `docker push` a mano sí podría entrar igual.

### Delivery vs Deployment
Implementé Continuous Delivery: QA se despliega solo y PROD espera mi aprobación. No hice
Deployment porque mi smoke solo verifica que la app responde; me faltarían tests end-to-end
y monitoreo.

### Cadena y secrets
`deploy-qa` tiene `needs` de los dos builds e `if` de rama `main`, así que los PRs no despliegan.
`deploy-prod` tiene `needs: deploy-qa`, hereda esa condición y usa el environment `production`
con aprobación. `DB_PASSWORD` es secret de repo porque lo usan los dos entornos; algo solo de
PROD iría en el environment `production`, para que otro job no lo pueda leer.

### Qué miro antes de aprobar
Que QA esté en verde, que el smoke haya pasado, qué cambia el diff y que sea el mismo commit que
pasó por QA. Rechacé este deploy: https://github.com/matiasbocco/DevOps-IngeSoft3/actions/runs/38277376420

### Letra chica de mi infraestructura
No uso free tier: es un servidor de Fulgor con self-hosted runner, así que no hay cold start,
sleep ni límite de horas o minutos de build. La contra es que si el servidor o el runner están
caídos no hay deploy, y las URLs solo se ven dentro de la red de Fulgor, que yo puedo acceder remoto via VPN 
o SSH por puertos expuestos a internet.

### Qué garantía pierdo al reconstruir
No uso Render, pero pasa lo mismo: el deploy hace `docker compose up --build` y reconstruye desde
el commit. Despliego el mismo commit, no la misma imagen que pasó los tests.

### Qué va por variable y qué en la imagen
Por variable: `BACKEND_URL` y `DNS_RESOLVER` del front (nginx los lee al arrancar), `DATABASE_URL`
y la password. En la imagen: el código, el build del front y la plantilla de nginx. Por eso la
misma imagen del front sirve en QA y en PROD.

### Qué prueba el smoke y qué no
Reintenta 30 veces cada 20 s contra `/health`, `/api/items` (que toca la base) y el front. Prueba
que la app responde, pero no qué versión está corriendo.

### Pattern y rollback
Para producción real usaría blue-green: el rollback es instantáneo y el doble de infraestructura
no es caro para una app chica. Me falta monitoreo de errores y latencia para saber cuándo volver atrás. Mi rollback hoy: re-run del `deploy-prod` de la última corrida
buena y aprobarlo.

Lo medí volviendo PROD de `ceb47f8` (PR #30) a `960d26e` (PR #28) con *Re-run all jobs* de
https://github.com/matiasbocco/DevOps-IngeSoft3/actions/runs/38169490996: empezó a las 18:13:01 y
`deploy-prod` terminó en verde a las 18:15:29 (12/10/2026), o sea **2 min 28 s**. De eso, el
`deploy-prod` en sí tardó 13 s y ~27 s fueron la espera de mi aprobación; el resto fue volver a
correr builds y QA (re-ejecutando solo `deploy-prod` sería menos de un minuto). El rollback de
código no deshace los datos que ya escribió la versión nueva.

### Problemas
- El servidor no llegaba a la CDN de GitHub: bajé el runner en mi notebook y lo pasé con `scp`.
- `DB_PASSWORD` no estaba donde el job lo leía y Postgres no arrancaba.
- La migración no tenía los atributos de EF y `/api/items` daba 500: los agregué y sumé un test.

### Uso de IA
Usé Claude principalmente como guía para conectar GitHub con la red de Fulgor: entrar al servidor
por el salto SSH con llaves, crear el usuario del runner, instalarlo como servicio y resolver que el
servidor no llegaba a la CDN de GitHub. También me ayudo con el `ci.yml` de publicación y deploy,
los compose de QA/PROD, la plantilla de nginx, el arreglo de la migración con su test, revisando que este
todo en orden y me ayudó a diagnosticar los errores del deploy.

Los comandos en el servidor y la configuración en GitHub (environments, secret, runner, paquetes
públicos) los hice yo. Lo verifiqué corriendo el pipeline de punta a punta, aprobando y rechazando
deploys, haciendo `docker pull` sin login y comprobando que un dato creado en PROD no aparece en QA.

## TP7 — Contenedores en el pipeline + integración y e2e

### Build once, deploy many
En el TP6 el servidor reconstruía la imagen (`compose up --build`), así que PROD no era lo que se probó.
Ahora los compose usan `image: ghcr.io/...:${IMAGE_TAG}` y QA, las pruebas y PROD corren la misma imagen.

### Etiquetas
`sha-<commit>` identifica la imagen de un build verificado; `v7.0.0` nombra la versión en PROD. No uso
`latest` porque se mueve y no dice qué corre. Del tag a la imagen: `git rev-list -n1 v7.0.0` → `sha-<ese commit>`.

### Cómo sé que corre la imagen
El log del deploy muestra el `pull` del `sha-<commit>` de la corrida. El smoke no lo prueba: solo pregunta
si responde.

### Pruebas
Integración (api de QA, sin navegador): alta y borrado, nombre vacío da 400, y registrar stock suma.
e2e (navegador contra QA): crear y eliminar, error con nombre en blanco, y cargar stock dos veces suma.
Elegí la suma de stock porque es lo que el usuario hace todos los días. Las validaciones finas quedan en los
unitarios del TP5: arriba de la pirámide van pocas pruebas.

### Diagnóstico de la rotura
Hice que el front elimine con `/api/item/{id}`. Integración verde (la api y la base andan) y e2e roja (el
front no borra; la traza muestra el 404): el problema está en el front. `deploy-prod` ni pidió aprobación.

### Integración amplia
Pruebo contra la api de QA ya desplegada: gano probar la imagen y la base reales con poca configuración;
pierdo que corre después del deploy y que QA es compartido.

### Tiempos y flaky
No hay cold start (servidor siempre prendido). Igual: 15 s por aserción, 60 s por test y 1 retry. Flaky es
un test que pasa recién en el retry sin cambios en el código.

### Misma imagen del front
nginx lee `BACKEND_URL` al arrancar; la URL de la api no está dentro de la imagen.

### Límite conocido
QA es uno solo: dos merges seguidos pueden pisarse las pruebas. Mergeo de a uno.

### Problemas
- El runner no tiene Node ni `sudo`: las suites corren en la imagen oficial de Playwright con `--network host`.
- Agregué `aria-label` en Eliminar y `role="alert"` en el error para que los tests encuentren los controles.
- Vitest tomaba los specs de Playwright: los excluí.

### Uso de IA
Claude me ayudó con los compose, los jobs y las suites de Playwright. Los deploys, aprobaciones y la lectura
de los reportes los hice y verifiqué yo.
