import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./layout/main-layout/main-layout').then((m) => m.MainLayout),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/dashboard/dashboard').then((m) => m.Dashboard),
        title: 'Minerva — Inicio',
      },
      {
        path: 'catalog',
        loadChildren: () =>
          import('./features/catalog/catalog.routes').then((m) => m.CATALOG_ROUTES),
      },
      {
        path: 'inventory',
        loadChildren: () =>
          import('./features/inventory/inventory.routes').then(
            (m) => m.INVENTORY_ROUTES,
          ),
      },
      {
        path: 'purchases',
        loadChildren: () =>
          import('./features/purchases/purchases.routes').then(
            (m) => m.PURCHASES_ROUTES,
          ),
      },
    ],
  },
  {
    path: 'login',
    loadComponent: () =>
      import('./features/login/login').then((m) => m.Login),
    title: 'Minerva — Acceder',
  },
  {
    path: '**',
    loadComponent: () =>
      import('./features/not-found/not-found').then((m) => m.NotFound),
    title: 'Minerva — Página no encontrada',
  },
];
