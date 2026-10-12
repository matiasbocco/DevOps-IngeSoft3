# Enlaces de este TP

- **Paquetes públicos** (etiquetados con el commit de un merge; `docker pull` sin credenciales):
  - Backend: `ghcr.io/matiasbocco/devops-ingesoft3-backend:sha-960d26e36182a0b8dde422e65f555508c264f413` (digest `sha256:e9525f08fc9273df4e3ce71dabecc60d2c5b5e9e47416668d521b8905989aff8`) · https://github.com/matiasbocco/DevOps-IngeSoft3/pkgs/container/devops-ingesoft3-backend
  - Frontend: `ghcr.io/matiasbocco/devops-ingesoft3-frontend:sha-960d26e36182a0b8dde422e65f555508c264f413` (digest `sha256:48a67cd783853160d8c9cf3612d3376bb12c2db4645d80789f07fe1c54930628`) · https://github.com/matiasbocco/DevOps-IngeSoft3/pkgs/container/devops-ingesoft3-frontend
- **La cadena** (Tarea 1):
  - Corrida de un PR con tests en verde, job que publica, «Entrar al registry» salteado (PR #28): https://github.com/matiasbocco/DevOps-IngeSoft3/actions/runs/38169151145/job/114557884843
  - Lista de pasos de una corrida de `main`, con «Construir y publicar la imagen» como último paso: https://github.com/matiasbocco/DevOps-IngeSoft3/actions/runs/38169490996/job/114558901439
- **Entornos** (plan C, ver sección TP6): QA http://172.16.0.110:3000 (front) y http://172.16.0.110:8080 (API) · PROD http://172.16.0.110:3001 (front) y http://172.16.0.110:8081 (API). Corren en un servidor de Fulgor (red interna), levantados por el self-hosted runner; se navegan en vivo en la defensa.

---

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

> BORRADOR. Las secciones marcadas con TODO-MATIAS las tengo que escribir yo con mis palabras
> y con lo que vi en mis corridas; el resto es una base para revisar, no para copiar sin entender.

### Por qué el artefacto se publica sólo con la verificación en verde

Una imagen en el registry tiene que querer decir «esto pasó la verificación». Si el pipeline
publicara igual cuando los tests fallan, estar publicado dejaría de significar algo y el registry
sería un depósito de cosas que alguien construyó alguna vez. La garantía sale de encadenar tres
cosas que ya existían, sin ningún control nuevo:

1. Nada entra a `main` sin el pipeline en verde (gate del TP4 + umbral de cobertura del TP5).
2. Sólo `main` publica: el `push:` del build final es `github.event_name == 'push' && github.ref == 'refs/heads/main'`, y el login al registry sólo corre en `push`.
3. Publicar es el **último paso** del mismo job que corre los tests: los steps corren en orden y
   se cortan en el primer error, así que si los tests fallan ese paso nunca llega a correr.

Lo que **no** garantiza: un `docker push` hecho a mano desde mi notebook entra igual al registry.
La cadena garantiza lo que publica el pipeline, no lo que físicamente puede entrar. Una garantía más
fuerte sería desplegar por *digest* (`@sha256:…`), que identifica el contenido y no una etiqueta.

### Continuous Delivery vs Continuous Deployment

Implementé **Continuous Delivery**: cada cambio verificado llega solo a QA, pero PROD espera una
aprobación humana en el environment `production`. Continuous Deployment sacaría ese humano y haría
que todo lo que pasa los tests llegue solo a producción; eso exige una red de seguridad (tests,
monitoreo, rollback rápido) que esta app todavía no tiene. TODO-MATIAS: decir si la querría y qué me faltaría.

### Diseño de la cadena y alcance de los secrets

`deploy-qa` tiene `needs: [build-backend, build-frontend]` e `if: github.ref == 'refs/heads/main'`:
sin CI verde no hay deploy, y los PRs verifican pero no despliegan. `deploy-prod` tiene
`needs: deploy-qa` y **no repite** el `if` de rama: lo hereda por la cadena, porque si `deploy-qa`
no corre (un PR), `deploy-prod` tampoco. Cada deploy declara su `environment` (`qa` /
`production`), que le da secrets, historial de Deployments y reglas de protección.

El secret `DB_PASSWORD` (password de las bases locales) vive en TODO-MATIAS: indicar si lo guardé en
el repo o en cada environment, y qué pasaría si el de PROD estuviera en el repo (cualquier job, incluso
uno de QA o de un PR, podría leerlo). El `GITHUB_TOKEN` del publicado dura lo que el job y se declara con
`permissions:` **dentro de cada job** (mínimo privilegio), no a nivel del workflow.

### Qué mira mi aprobador antes de aprobar

TODO-MATIAS: escribir mis criterios reales (qué miro en la corrida: QA verde, smoke que pasó, qué
cambia el commit, si el sha coincide con el de QA...) y qué NO puedo ver desde el gate.

### Rechazo documentado

TODO-MATIAS: enlazar el run rechazado y escribir el motivo propio y específico (qué vi en esa
corrida), no un ejemplo genérico.

### Plan C: por qué local y qué pierdo

Usé el fallback de la materia: **self-hosted runner + docker compose** como entornos QA y PROD
(`compose.qa.yml` y `compose.prod.yml`) en un servidor de Fulgor (172.16.0.110), en lugar de Render/Neon. TODO-MATIAS: contar el motivo real de la decisión.

Cumplo el mismo contrato: (1) dos entornos separados y simultáneos, cada uno con su proyecto de
Compose (`name: qa` / `name: prod`), sus puertos (8080/3000 y 8081/3001) y su volumen de Postgres
(`db_data_qa` / `db_data_prod`), de modo que son bases distintas; (2) front y back corren como contenedores
construidos con mis Dockerfiles; (3) el deploy lo dispara **una corrida de Actions** en el runner, no yo con
`docker compose up` a mano; (4) PROD está detrás del environment `production` con required reviewer.
Sin `name:` distinto el deploy de PROD recrearía los contenedores de QA.

Lo comprobé creando un item sólo en PROD (`POST :8081/api/items/stock`): aparece al listar PROD y la lista de QA,
consultada a través de su front (`:3000/api/items`), sigue vacía. Eso prueba a la vez que las bases son distintas y que
el nginx de cada entorno habla con **su** backend.

Lo que pierdo respecto de la nube: no hay URLs públicas, las URLs sólo se alcanzan desde la red interna de Fulgor, y
si el servidor o el runner están caídos no hay deploys ni entornos, y no existe el cold start real que obliga a
diseñar reintentos contra infra ajena. En compensación no hay horas de instancia ni minutos de build que
presupuestar. Seguridad del runner: GitHub desaconseja runners propios en repos públicos porque un PR de un
fork podría ejecutar código en el servidor; lo mitigo con *Require approval for all external contributors*
y sin aceptar PRs de desconocidos. TODO-MATIAS: aclarar qué autorización de Fulgor tengo para usar ese servidor.

### Qué garantía pierdo porque se reconstruye desde el checkout

El job hace `docker compose up -d --build`: construye otra vez la imagen desde el commit que baja
`actions/checkout`, en lugar de ejecutar la imagen que publiqué en ghcr. Despliego **el mismo commit** que se
verificó (el checkout es el de la corrida, no la punta de la rama), pero no **la misma imagen**: una dependencia
o una imagen base que cambie entre un build y el otro podría producir algo distinto. Es el problema que el TP7 cierra.

### Qué quedó por variable y qué dentro de la imagen

Por variable de entorno: `BACKEND_URL` y `DNS_RESOLVER` del front (nginx las lee al arrancar desde la plantilla
`default.conf.template`), `DATABASE_URL` y la password de la base. Dentro de la imagen: el código, el `dist/`
de Vite y la plantilla de nginx con sus valores por defecto de Compose. Por eso **la misma imagen del front**
sirve en QA y en PROD y cada una habla con su api.

### Qué prueba el smoke test y qué no

Reintenta 30 veces cada 20 s (con `--max-time` en cada `curl`) porque el entorno puede tardar en arrancar. Verifica
`/health` (proceso vivo), `/api/items` (la BD responde: un `/health` que no toca la base da verde con la
conexión rota), el front en `/` y `/api/items` **a través del front** (prueba que nginx llega al backend por
`BACKEND_URL`). Lo que **no** dice es qué versión está corriendo: contesta, pero un deploy cuyo build falló y deja
la versión anterior en pie también da verde. Una mejora sería que `/health` devuelva el commit y el smoke lo compare con `github.sha`.

### Deployment pattern para una producción real, y rollback

TODO-MATIAS: elegir patrón (blue-green / canary / rolling / flags) y justificar por costo, riesgo, rollback y la
observabilidad que me falta hoy.

**Rollback actual**: TODO-MATIAS: pasos reales y **tiempo medido** (hora de inicio y de fin del redeploy del
commit anterior, tomadas de Actions/Deployments). Hacerlo una vez de verdad; un «unos minutos» no cuenta.
Recordar qué NO deshace un rollback de código: los datos que ya escribió la versión nueva.

### Problemas encontrados y cómo los resolví

- `${{ github.repository }}` en el tag falla con *repository name must be lowercase* porque el repo se llama
  `DevOps-IngeSoft3`: escribí el nombre del paquete a mano en minúsculas.
- El `Dockerfile` del backend copia `backend/` y `backend.tests/`, así que necesita el repo como contexto de build
  (`context: .`); el `docker-compose.yml` heredado del TP2 tenía `build: ./backend` y ya no construía. Lo corregí.
- La guía usa `/api/tareas` para el smoke, que es de la app de la cátedra; mi app expone `/api/items`.
- TODO-MATIAS: agregar los problemas reales que me aparezcan (runner, permisos, aprobación, etc.).

### Declaración de uso de IA

TODO-MATIAS: declarar qué parte fue asistida por IA (workflow de deploy, compose, plantilla de nginx, este borrador) y
cómo lo verifiqué. Tengo que poder explicar qué pasa exactamente entre el merge y PROD: cada compuerta, cada secret, cada espera.
