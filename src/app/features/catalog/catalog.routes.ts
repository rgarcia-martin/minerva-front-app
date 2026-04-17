import { Routes } from '@angular/router';

export const CATALOG_ROUTES: Routes = [
  {
    path: 'articles',
    loadComponent: () =>
      import('./articles/articles-page').then((m) => m.ArticlesPage),
    title: 'Minerva — Artículos',
  },
  {
    path: 'taxes',
    loadComponent: () =>
      import('./taxes/taxes-page').then((m) => m.TaxesPage),
    title: 'Minerva — Impuestos',
  },
  {
    path: 'free-concepts',
    loadComponent: () =>
      import('./free-concepts/free-concepts-page').then((m) => m.FreeConceptsPage),
    title: 'Minerva — Conceptos libres',
  },
  {
    path: 'locations',
    loadComponent: () =>
      import('./locations/locations-page').then((m) => m.LocationsPage),
    title: 'Minerva — Localizaciones',
  },
  {
    path: 'payment-methods',
    loadComponent: () =>
      import('./payment-methods/payment-methods-page').then((m) => m.PaymentMethodsPage),
    title: 'Minerva — Métodos de pago',
  },
];
