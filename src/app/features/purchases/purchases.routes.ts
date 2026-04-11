import { Routes } from '@angular/router';

export const PURCHASES_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./purchases-list-page').then((m) => m.PurchasesListPage),
    title: 'Minerva — Compras',
  },
  {
    path: 'new',
    loadComponent: () =>
      import('./purchase-editor-page').then((m) => m.PurchaseEditorPage),
    title: 'Minerva — Nueva compra',
  },
  {
    path: ':id',
    loadComponent: () =>
      import('./purchase-editor-page').then((m) => m.PurchaseEditorPage),
    title: 'Minerva — Editar compra',
  },
];
