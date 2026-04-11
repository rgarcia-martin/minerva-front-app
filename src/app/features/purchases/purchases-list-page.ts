import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';

import { Provider } from '../people/providers/provider.model';
import { ProviderClient } from '../people/providers/provider.client';
import { PurchaseClient } from './purchase.client';
import { Purchase } from './purchase.model';

@Component({
  selector: 'app-purchases-list-page',
  imports: [RouterLink],
  templateUrl: './purchases-list-page.html',
})
export class PurchasesListPage implements OnInit {
  private readonly client = inject(PurchaseClient);
  private readonly providerClient = inject(ProviderClient);

  protected readonly purchases = signal<Purchase[]>([]);
  protected readonly providers = signal<Provider[]>([]);
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly providersById = computed(() => {
    const map = new Map<string, Provider>();
    for (const p of this.providers()) map.set(p.id, p);
    return map;
  });

  ngOnInit(): void {
    this.refresh();
  }

  protected refresh(): void {
    this.loading.set(true);
    this.error.set(null);
    forkJoin({
      purchases: this.client.list(),
      providers: this.providerClient.list(),
    }).subscribe({
      next: ({ purchases, providers }) => {
        this.purchases.set(purchases);
        this.providers.set(providers);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('No se pudieron cargar las compras.');
        this.loading.set(false);
      },
    });
  }

  protected providerName(id: string): string {
    return this.providersById().get(id)?.businessName ?? '—';
  }

  protected formatDate(value: string | null): string {
    if (!value) return '—';
    return value.slice(0, 10);
  }
}
