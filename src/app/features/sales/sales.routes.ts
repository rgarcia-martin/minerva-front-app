import { Routes } from '@angular/router';

export const SALES_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./sales-list-page').then((m) => m.SalesListPage),
    title: 'Minerva — Ventas',
  },
  {
    path: 'new',
    loadComponent: () =>
      import('./sales-editor-page').then((m) => m.SalesEditorPage),
    title: 'Minerva — Nueva venta',
  },
  {
    path: ':id',
    loadComponent: () =>
      import('./sales-editor-page').then((m) => m.SalesEditorPage),
    title: 'Minerva — Venta',
  },
];
