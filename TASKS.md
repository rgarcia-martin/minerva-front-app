# TASKS — Reescritura del CMS de eLibreria sobre Angular + minerva-core

Este documento es la hoja de ruta del proyecto **minerva-front-app**: un frontend SPA en Angular (última versión) que reproduce las pantallas y flujos del antiguo CMS Symfony de eLibreria (`J:/Proyectos/fms-elibreria-app/src/source_cms`) consumiendo el API REST de **minerva-core** (`J:/Proyectos/minerva-core`, base `http://localhost:8080/api/v1`).

> El documento se irá actualizando iteración a iteración. Cada checkbox marca una entrega real verificable.

---

## 1. Contexto

### 1.1. Origen — `source_cms` (Symfony 4 / Twig / Vue.js puntual)
Aplicación monolítica con backend y frontend en el mismo repositorio. Lo que vamos a "rescatar" son **únicamente las pantallas, flujos de usuario y estructura de navegación**, no la lógica PHP — la lógica vivirá en `minerva-core`.

Estructura relevante del origen:

```
source_cms/source/
├── src/Controller/
│   ├── ATools/                       # Herramientas de admin
│   │   ├── EmployeesController.php
│   │   ├── TaxesController.php
│   │   ├── WithHoldingsController.php
│   │   ├── ExtAppsController.php
│   │   └── Store/                    # Cegal, Dilve, Fande, MyFiscalEntity, Notifications, SimpleBill...
│   ├── SATools/Config/               # Super-admin config
│   ├── UTools/                       # Herramientas de usuario (operativa diaria)
│   │   ├── UserController.php        # Login / perfil
│   │   ├── SearchController.php      # Buscador global
│   │   ├── FilterController.php
│   │   ├── Accounting/               # Bills, BillSeries, BillPayMethods
│   │   ├── Knowledge/                # Articles, Authors, Books, Languages, Publishers, Styles
│   │   ├── Reports/                  # SalesReport, FandeDirectory, SinliFiles
│   │   └── Store/                    # Buys, Sales, Clients, Locations, Providers, PromoCodes, RapidCodes, ProviderContracts, Facilities
│   ├── CmsController.php
│   ├── IndexController.php
│   └── AbstractCrudEntity.php
├── templates/
│   ├── base.html.twig                # Layout base (Metronic + Bootstrap 4)
│   ├── layout.html.twig              # Layout con header + side menu
│   ├── includes/                     # header.html.twig, left_menu.html.twig, paginación, bs4 form layout
│   ├── crud/                         # form-tab, form-vertical-one-page, list (CRUDs reutilizables)
│   ├── index/index.html.twig         # Dashboard con accesos rápidos, estadísticas y gráficas
│   ├── user/login.html.twig          # Login
│   ├── atools/                       # Plantillas espejo del controller ATools
│   ├── satools/                      # Plantillas espejo de SATools
│   └── utools/                       # Plantillas espejo de UTools (incluye search.html.twig)
└── public/                            # css, js, fuentes, externals (Metronic, Vue, Chart.js, Fancybox, Flickity...)
```

### 1.2. Destino — `minerva-core` (Spring Boot, DDD)
API REST organizada por bounded context (`catalog`, `inventory`, `identity`, `purchasing`, `payment`, `sales`, `shared`). Endpoints existentes (todos bajo `/api/v1`):

| Recurso          | Path                     | Operaciones disponibles      |
|------------------|--------------------------|------------------------------|
| Articles         | `/articles`              | CRUD                         |
| Taxes            | `/taxes`                 | CRUD                         |
| Free Concepts    | `/free-concepts`         | CRUD                         |
| Items            | `/items`                 | GET list, GET by id (read-only) |
| Locations        | `/locations`             | CRUD                         |
| Users            | `/users`                 | CRUD                         |
| Payment Methods  | `/payment-methods`       | CRUD                         |
| Providers        | `/providers`             | CRUD                         |
| Purchases        | `/purchases`             | CRUD (genera Items)          |
| Sales            | `/sales`                 | POST/GET/DELETE              |

Errores normalizados vía `ApiExceptionHandler` (`ApiErrorResponse(timestamp, status, error, message, path)`).

---

## 2. Mapa origen ↔ minerva-core

| Módulo origen (Symfony)               | Plantilla / Controller origen           | Endpoint minerva-core                | Estado |
|---------------------------------------|------------------------------------------|--------------------------------------|--------|
| Login / sesión                        | `templates/user/login.html.twig`         | (no expuesto)                        | **Gap** — pendiente de auth en API |
| Dashboard / index                     | `templates/index/index.html.twig`        | agregación de varios endpoints       | OK (compone) |
| ATools › Employees                    | `atools/employees`                       | `/users`                             | OK     |
| ATools › Taxes                        | `atools/taxes`                           | `/taxes`                             | OK     |
| ATools › Withholdings                 | `atools/withholdings`                    | —                                    | **Gap** |
| ATools › External Apps                | `atools/extapps`                         | —                                    | **Gap** |
| ATools › Store › Cegal Account        | `atools/store/cegalaccount`              | —                                    | **Gap** |
| ATools › Store › Dilve Account        | `atools/store/dilveaccount`              | —                                    | **Gap** |
| ATools › Store › Fande Account        | `atools/store/fandeaccount`              | —                                    | **Gap** |
| ATools › Store › My Fiscal Entity     | `atools/store/myfiscalentity`            | —                                    | **Gap** |
| ATools › Store › Notification         | `atools/store/notification`              | —                                    | **Gap** |
| ATools › Store › Simple Bill          | `atools/store/simple_bill`               | —                                    | **Gap** |
| SATools › Config                      | `satools/config`                         | —                                    | **Gap** |
| UTools › Store › Locations            | `utools/store/locations`                 | `/locations`                         | OK     |
| UTools › Store › Providers            | `utools/store/providers`                 | `/providers`                         | OK     |
| UTools › Store › Provider Contracts   | `utools/store/providers/provider_contracts` | —                                | **Gap** |
| UTools › Store › Buys                 | `utools/store/buys`                      | `/purchases`                         | OK     |
| UTools › Store › Sales                | `utools/store/sales`                     | `/sales`                             | OK     |
| UTools › Store › Quick Sale           | `utools/store/sales/quick_sale.html.twig`| `/sales` (POST simplificado)         | OK     |
| UTools › Store › Clients              | `utools/store/clients`                   | (sólo UUID en `Sale.clientId`)       | **Parcial** — falta CRUD en API |
| UTools › Store › Promo Codes          | `utools/store/promocodes`                | —                                    | **Gap** |
| UTools › Store › Rapid Codes          | `utools/store/rapidcodes`                | `/free-concepts` (aproximación)      | **Parcial** |
| UTools › Store › Facilities           | `utools/store/facilities`                | —                                    | **Gap** |
| UTools › Accounting › Bills           | `utools/accounting/bills`                | —                                    | **Gap** |
| UTools › Accounting › Bill Series     | `utools/accounting/billseries`           | —                                    | **Gap** |
| UTools › Accounting › Bill Pay Methods| `utools/accounting/billpaymethods`       | `/payment-methods` (aproximación)    | **Parcial** |
| UTools › Knowledge › Articles         | `utools/knowledge/articles`              | `/articles`                          | OK     |
| UTools › Knowledge › Authors          | `utools/knowledge/authors`               | —                                    | **Gap** |
| UTools › Knowledge › Books            | `utools/knowledge/books`                 | —                                    | **Gap** |
| UTools › Knowledge › Languages        | `utools/knowledge/languages`             | —                                    | **Gap** |
| UTools › Knowledge › Publishers       | `utools/knowledge/publishers`            | —                                    | **Gap** |
| UTools › Knowledge › Styles           | `utools/knowledge/styles`                | —                                    | **Gap** |
| UTools › Reports › Sales              | `utools/reports/sales`                   | (agregación / pendiente)             | **Gap** |
| UTools › Reports › FANDE Directory    | `utools/reports/fandedirectory`          | —                                    | **Gap** |
| UTools › Reports › SINLI Files        | `utools/reports/sinlifiles`              | —                                    | **Gap** |
| Búsqueda global                       | `utools/search.html.twig`                | (agregación)                         | **Gap** |

> Items marcados como **Gap** o **Parcial** implican que, antes de implementar la pantalla equivalente, hay que ampliar `minerva-core` (nuevo bounded context, nuevo agregado o nuevo endpoint). Cada uno se traduce en un ticket aparte en el backlog del backend.

---

## 3. Iteraciones

### Iteración 0 — Bootstrap *(esta entrega)*
- [x] Documento `TASKS.md` con plan completo y mapa de mapeo
- [x] Scaffold de Angular última versión en `J:/Proyectos/minerva-front-app/`
- [x] App arrancable con `npm start`
- [x] Primer test smoke que verifica que la app responde

### Iteración 1 — Esqueleto navegable (sin lógica de negocio)
- [x] Layout principal: `header` + `side-menu` + `content` + `footer` (`src/app/layout/`)
- [x] Routing inicial: `/`, `/login`, `/dashboard`, `**` → 404 (`src/app/app.routes.ts`)
- [x] `environment.ts` con `apiBaseUrl` (`/api/v1`) (`src/environments/environment.ts`)
- [x] Proxy de desarrollo `/api` → `http://localhost:8080` (`proxy.conf.json` + `angular.json`)
- [x] `HttpClient` provisto a nivel de app + `apiErrorInterceptor` base (`src/app/core/http/`)
- [x] Tema visual inicial generado de cero — tokens SCSS, tipografía y paleta indigo/slate (`src/styles/`)
- [x] Servicio `HealthService` que pinta el estado de la API en el dashboard (`src/app/core/api/`)

### Iteración 2 — Identidad y autenticación
- [ ] Pantalla de login (espejo simplificado de `templates/user/login.html.twig`)
- [ ] Servicio de auth contra `minerva-core` (estrategia provisional mientras la API no expone JWT)
- [ ] `AuthGuard` y `RoleGuard`
- [ ] Menú de usuario, logout, edición de perfil
- [ ] **Backend**: definir y abrir ticket en `minerva-core` para el endpoint de login y emisión de token

### Iteración 3 — Catálogo *(esta entrega — saltamos iteración 2 para empezar a ver datos del API)*
- [x] Cliente CRUD genérico `ResourceClient<TResponse, TRequest>` (`src/app/core/api/resource-client.ts`)
- [x] Utilidades SCSS compartidas para tablas, formularios, alertas, badges y toolbars (`src/styles/_base.scss`)
- [x] CRUD `Taxes` (`/taxes`) — `src/app/features/catalog/taxes/`
- [x] CRUD `Locations` (`/locations`) — `src/app/features/catalog/locations/`
- [x] CRUD `Free Concepts` (`/free-concepts`) con desplegable de impuestos — `src/app/features/catalog/free-concepts/`
- [x] CRUD `Articles` (`/articles`) con desplegable de impuestos, checkbox `canHaveChildren` y selector de artículo hijo — `src/app/features/catalog/articles/`
- [x] Listado read-only `Items` (`/items`) con filtros por estado (chips) — `src/app/features/inventory/items/`
- [x] Routing por feature (`catalog.routes.ts` + `inventory.routes.ts`) montado en el `MainLayout`
- [x] Side-menu actualizado con accesos a Catálogo e Inventario

### Iteración 4 — Identidad operativa y métodos de pago
- [ ] CRUD `Users` / Empleados (`/users`)
- [ ] CRUD `Payment Methods` (`/payment-methods`)

### Iteración 5 — Compras *(parcial — editor de compras prioritario, resto pendiente)*
- [x] Modelo y cliente HTTP de `Providers` (consumido por el editor; CRUD completo aún pendiente) — `src/app/features/people/providers/`
- [x] Modelo y cliente HTTP de `Purchases` — `src/app/features/purchases/purchase.{model,client}.ts`
- [x] Listado de compras con totales — `src/app/features/purchases/purchases-list-page.{ts,html}`
- [x] Editor de compras (`/purchases/new`, `/purchases/:id`) con búsqueda global de artículos, alta rápida en popup y matemática reactiva basePrice ↔ profitMargin ↔ tax ↔ salePrice — `src/app/features/purchases/purchase-editor-page.{ts,html}` + `purchase-line-math.ts` + `article-quick-create-form.{ts,html}`
- [x] Acceso "Compras" habilitado en el side-menu y rutas lazy registradas
- [ ] CRUD completo `Providers` (`/providers`) — listado, alta y edición desde su propia sección
- [ ] Visor del inventario (`Items`) generado por una compra
- [ ] Soporte del flujo "box-opening" (artículos con `canHaveChildren`)
- [ ] Estados especiales por línea (reservar, bloquear, abrir caja…) — pospuesto deliberadamente

### Iteración 6 — Ventas
- [x] Modelo y cliente HTTP `PaymentMethod` (`/payment-methods`) — `src/app/features/catalog/payment-methods/` (prerequisito)
- [x] Modelo y cliente HTTP `User` (`/users`) — `src/app/features/people/users/` (prerequisito)
- [x] Modelo y cliente HTTP `Sale` (`/sales`) — sin `update` (agregado inmutable) — `src/app/features/sales/sale.{model,client}.ts`
- [x] Helpers puros de cálculo `sale-line-math.ts` + tests Jasmine
- [x] Listado `Sales` (`/sales`) con código, empleado, fecha, estado, total — `sales-list-page.{ts,html}`
- [x] Editor "Nueva venta" (`/sales/new`) con búsqueda unificada artículos + conceptos libres, líneas XOR item/freeConcept, cabecera (código/empleado/método de pago) y total — `sales-editor-page.{ts,html}`
- [x] Vista read-only de venta existente (`/sales/:id`) con borrado (liberación de stock)
- [x] Rutas lazy + entrada "Ventas" en side-menu
- [ ] Pantalla "venta rápida" (`quick_sale`)

#### Deferido en primera iteración de "Nueva Venta" (atacar en iteraciones posteriores)
- [ ] **Cliente asociado a la venta**: el backend acepta `clientId` opcional pero `minerva-core` aún no expone `ClientController`. Se deja el campo fuera del formulario hasta que exista el endpoint CRUD de clientes.
- [ ] **Códigos promocionales y lock/unlock de items**: el CMS antiguo de eLibreria permitía aplicar promo codes y bloquear/reservar items durante la edición. Fuera de alcance hasta que `minerva-core` exponga el agregado `PromoCode` y las transiciones de `ItemStatus` (RESERVED/OPENED) vía API.
- [ ] **Impresión de ticket**: vista imprimible post-venta (equivalente a la plantilla `sales/ticket.html.twig` del legacy). Requiere definir formato y, probablemente, un endpoint que devuelva el ticket renderizado o los datos normalizados.
- [ ] **Descuentos por línea y globales**: `minerva-core` no acepta `discount` en `SaleLineRequest` ni un descuento global en la venta. Queda fuera hasta que el backend amplíe el agregado `Sale`.

### Iteración 7 — Dashboard y búsqueda global
- [ ] Página principal con accesos rápidos y estadísticas (espejo de `templates/index/index.html.twig`)
- [ ] Gráficos de evolución de compras / ventas
- [ ] Buscador global en el header

### Iteración 8 — Calidad y entrega
- [ ] Tests unitarios por servicio y componente
- [ ] Tests e2e (decidir entre Cypress / Playwright)
- [ ] Linter, formatter, hooks pre-commit
- [ ] Pipeline CI (build + test + lint)
- [ ] Configuración de despliegue (Dockerfile, nginx)

### Iteración 9+ — Cierre de gaps con minerva-core
Cada gap del apartado §2 se desbloquea cuando el backend correspondiente esté disponible. Los principales:
- Authentication / Sessions
- Clients (CRUD completo)
- Books / Authors / Publishers / Languages / Styles (subdominio Knowledge en `minerva-core`)
- Promo Codes / Rapid Codes / Facilities
- Bills / BillSeries (subdominio Accounting en `minerva-core`)
- Withholdings
- Reports (compras, ventas, stock, FANDE, SINLI)
- Integraciones externas (Cegal, Dilve, FANDE)
- Store config / MyFiscalEntity
- Notifications

---

## 4. Stack técnico previsto
- **Angular** última versión (standalone components, signals, control flow `@if/@for`)
- **Routing** nativo con lazy-loading por feature
- **HttpClient** + interceptores (auth, errores, baseUrl)
- **Reactive Forms** (Forms tipados)
- **SCSS** con variables y mixins propios; tema inspirado en eLibreria
- **Karma + Jasmine** (default scaffold) para unit tests
- (Pendiente decisión) **Cypress** o **Playwright** para e2e
- **ESLint + Prettier** (a configurar en iteración 8)

## 5. Convenciones del proyecto
- Estructura por feature: `src/app/features/<dominio>/<aggregate>/`
- Cada feature expone sus rutas (`<feature>.routes.ts`) y un facade service
- Sin `any` en código de aplicación (TypeScript estricto)
- DTOs en `src/app/features/<dominio>/<aggregate>/api/`
- Variables de entorno en `src/environments/environment*.ts`
- Internacionalización con la API nativa de Angular i18n (catálogo `es` por defecto)

## 6. Prerrequisitos de desarrollo
- Node ≥ 20 (entorno actual: Node 24)
- npm ≥ 10
- `minerva-core` corriendo en `http://localhost:8080`
  - `cd J:/Proyectos/minerva-core && ./mvnw spring-boot:run`
- Navegador Chromium para los tests (Karma headless)

## 7. Cómo arrancar (tras la iteración 0)
```bash
cd J:/Proyectos/minerva-front-app
npm install            # solo la primera vez
npm start              # http://localhost:4200
npm test               # ejecuta el smoke test
```
