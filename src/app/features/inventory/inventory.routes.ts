import { Routes } from '@angular/router';

export const INVENTORY_ROUTES: Routes = [
  {
    path: 'items',
    loadComponent: () =>
      import('./items/items-page').then((m) => m.ItemsPage),
    title: 'Minerva — Inventario',
  },
];
