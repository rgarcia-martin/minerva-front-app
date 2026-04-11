import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { forkJoin } from 'rxjs';

import { Article } from '../../catalog/articles/article.model';
import { ArticleClient } from '../../catalog/articles/article.client';
import { Item, ItemStatus } from './item.model';
import { ItemClient } from './item.client';

type StatusFilter = 'ALL' | ItemStatus;

interface StatusChip {
  key: StatusFilter;
  label: string;
}

@Component({
  selector: 'app-items-page',
  imports: [],
  templateUrl: './items-page.html',
})
export class ItemsPage implements OnInit {
  private readonly client = inject(ItemClient);
  private readonly articleClient = inject(ArticleClient);

  protected readonly items = signal<Item[]>([]);
  protected readonly articles = signal<Article[]>([]);
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly status = signal<StatusFilter>('ALL');

  protected readonly chips: StatusChip[] = [
    { key: 'ALL', label: 'Todos' },
    { key: 'AVAILABLE', label: 'Disponibles' },
    { key: 'SOLD', label: 'Vendidos' },
    { key: 'RESERVED', label: 'Reservados' },
    { key: 'OPENED', label: 'Abiertos' },
  ];

  protected readonly articlesById = computed(() => {
    const map = new Map<string, Article>();
    for (const a of this.articles()) map.set(a.id, a);
    return map;
  });

  protected readonly visibleItems = computed(() => {
    const filter = this.status();
    const all = this.items();
    if (filter === 'ALL') return all;
    return all.filter((i) => i.itemStatus === filter);
  });

  protected readonly counts = computed(() => {
    const total = this.items().length;
    const byStatus: Record<ItemStatus, number> = {
      AVAILABLE: 0,
      SOLD: 0,
      RESERVED: 0,
      OPENED: 0,
    };
    for (const item of this.items()) byStatus[item.itemStatus]++;
    return { total, ...byStatus };
  });

  ngOnInit(): void {
    this.refresh();
  }

  protected refresh(): void {
    this.loading.set(true);
    this.error.set(null);
    forkJoin({
      items: this.client.list(),
      articles: this.articleClient.list(),
    }).subscribe({
      next: ({ items, articles }) => {
        this.items.set(items);
        this.articles.set(articles);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('No se pudo cargar el inventario.');
        this.loading.set(false);
      },
    });
  }

  protected setStatus(value: StatusFilter): void {
    this.status.set(value);
  }

  protected articleName(id: string): string {
    return this.articlesById().get(id)?.name ?? '—';
  }

  protected articleCode(id: string): string {
    return this.articlesById().get(id)?.code ?? '';
  }

  protected statusBadgeClass(status: ItemStatus): string {
    return `badge badge--${status.toLowerCase()}`;
  }

  protected statusLabel(status: ItemStatus): string {
    switch (status) {
      case 'AVAILABLE':
        return 'Disponible';
      case 'SOLD':
        return 'Vendido';
      case 'RESERVED':
        return 'Reservado';
      case 'OPENED':
        return 'Abierto';
    }
  }
}
