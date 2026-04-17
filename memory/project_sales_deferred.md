---
name: Sales UI deferred scope
description: Three items intentionally postponed in the first iteration of the "Nueva Venta" editor — must be revisited later
type: project
---

La primera iteración del editor de ventas (`features/sales/`) deja fuera deliberadamente tres capacidades del CMS antiguo de eLibreria:

1. **Cliente asociado a la venta** — `Sale.clientId` es opcional en el backend pero `minerva-core` aún no expone `ClientController` (CRUD de clientes). El campo no se incluye en el formulario hasta que exista el endpoint.
2. **Códigos promocionales y lock/unlock de items** — el legacy permitía aplicar promo codes y bloquear/reservar items durante la edición. Requiere que `minerva-core` exponga el agregado `PromoCode` y transiciones explícitas de `ItemStatus` (RESERVED/OPENED) vía API.
3. **Impresión de ticket** — vista imprimible post-venta (equivalente a `sales/ticket.html.twig` del legacy). Requiere decidir formato (cliente vs endpoint que devuelva ticket renderizado).
4. **Descuentos (por línea y globales)** — el backend de `minerva-core` NO acepta `discount` en `SaleLineRequest` ni un descuento global en `CreateSaleRequest`. El editor legacy de eLibreria permitía ambos. Queda fuera hasta que `minerva-core` incorpore los campos (cambio de agregado Sale).

**Why:** el usuario pidió dejarlos abiertos para iteraciones posteriores tras revisar el plan de "Nueva Venta" del 2026-04-17. No son bugs ni olvidos — son scope reducido consciente porque dependen de endpoints/decisiones de backend que todavía no existen.

**How to apply:** si en una futura sesión el usuario pide "terminar ventas" o "añadir X al editor de ventas", verificar primero si X es uno de estos tres puntos y, en tal caso, confirmar que el prerequisito (endpoint en `minerva-core`, decisión de formato de ticket) ya está resuelto antes de implementar. También están registrados en `TASKS.md` bajo Iteración 6.
