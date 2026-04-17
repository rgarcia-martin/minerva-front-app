import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';

import { User } from '../people/users/user.model';
import { UserClient } from '../people/users/user.client';
import { SaleClient } from './sale.client';
import { Sale, SaleState } from './sale.model';

@Component({
  selector: 'app-sales-list-page',
  imports: [RouterLink],
  templateUrl: './sales-list-page.html',
})
export class SalesListPage implements OnInit {
  private readonly client = inject(SaleClient);
  private readonly userClient = inject(UserClient);

  protected readonly sales = signal<Sale[]>([]);
  protected readonly users = signal<User[]>([]);
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly usersById = computed(() => {
    const map = new Map<string, User>();
    for (const u of this.users()) map.set(u.id, u);
    return map;
  });

  protected readonly pageSizeOptions = [5, 10, 50];
  protected readonly pageSize = signal(5);
  protected readonly currentPage = signal(1);

  protected readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.sales().length / this.pageSize()))
  );

  protected readonly activePage = computed(() =>
    Math.min(this.currentPage(), this.totalPages())
  );

  protected readonly paginatedSales = computed(() => {
    const all = this.sales();
    const size = this.pageSize();
    const start = (this.activePage() - 1) * size;
    return all.slice(start, start + size);
  });

  ngOnInit(): void {
    this.refresh();
  }

  protected refresh(): void {
    this.loading.set(true);
    this.error.set(null);
    forkJoin({
      sales: this.client.list(),
      users: this.userClient.list(),
    }).subscribe({
      next: ({ sales, users }) => {
        this.sales.set(sales);
        this.users.set(users);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('No se pudieron cargar las ventas.');
        this.loading.set(false);
      },
    });
  }

  protected employeeName(id: string): string {
    const user = this.usersById().get(id);
    if (!user) return '—';
    return `${user.name} ${user.lastName}`;
  }

  protected formatDate(value: string | null): string {
    if (!value) return '—';
    return value.slice(0, 10);
  }

  protected stateLabel(state: SaleState): string {
    switch (state) {
      case 'NEW':
        return 'Nueva';
      case 'CONFIRMED':
        return 'Confirmada';
      case 'CANCELLED':
        return 'Cancelada';
      default:
        return '—';
    }
  }

  protected setPageSize(size: number): void {
    this.pageSize.set(size);
    this.currentPage.set(1);
  }

  protected goToPage(page: number): void {
    this.currentPage.set(page);
  }
}
