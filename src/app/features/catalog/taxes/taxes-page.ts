import { Component, OnInit, computed, inject, signal } from '@angular/core';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';

import { Tax, TaxRequest } from './tax.model';
import { TaxClient } from './tax.client';

type FormMode = { kind: 'closed' } | { kind: 'create' } | { kind: 'edit'; id: string };

@Component({
  selector: 'app-taxes-page',
  imports: [ReactiveFormsModule],
  templateUrl: './taxes-page.html',
})
export class TaxesPage implements OnInit {
  private readonly client = inject(TaxClient);
  private readonly fb = inject(FormBuilder);

  protected readonly taxes = signal<Tax[]>([]);
  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly formMode = signal<FormMode>({ kind: 'closed' });

  protected readonly form = this.fb.nonNullable.group({
    description: ['', [Validators.required, Validators.maxLength(120)]],
    rate: [0, [Validators.required, Validators.min(0)]],
    surchargeRate: [0, [Validators.required, Validators.min(0)]],
  });

  protected readonly pageSizeOptions = [5, 10, 50];
  protected readonly pageSize = signal(5);
  protected readonly currentPage = signal(1);

  protected readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.taxes().length / this.pageSize()))
  );

  protected readonly activePage = computed(() =>
    Math.min(this.currentPage(), this.totalPages())
  );

  protected readonly paginatedTaxes = computed(() => {
    const all = this.taxes();
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
    this.client.list().subscribe({
      next: (rows) => {
        this.taxes.set(rows);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('No se pudo cargar el listado de impuestos.');
        this.loading.set(false);
      },
    });
  }

  protected openCreate(): void {
    this.form.reset({ description: '', rate: 0, surchargeRate: 0 });
    this.formMode.set({ kind: 'create' });
  }

  protected openEdit(tax: Tax): void {
    this.form.reset({
      description: tax.description,
      rate: tax.rate,
      surchargeRate: tax.surchargeRate,
    });
    this.formMode.set({ kind: 'edit', id: tax.id });
  }

  protected closeForm(): void {
    this.formMode.set({ kind: 'closed' });
    this.error.set(null);
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const mode = this.formMode();
    if (mode.kind === 'closed') return;

    const body: TaxRequest = this.form.getRawValue();
    this.saving.set(true);
    this.error.set(null);

    const request$ =
      mode.kind === 'create'
        ? this.client.create(body)
        : this.client.update(mode.id, body);

    request$.subscribe({
      next: () => {
        this.saving.set(false);
        this.closeForm();
        this.refresh();
      },
      error: () => {
        this.error.set('No se pudo guardar el impuesto.');
        this.saving.set(false);
      },
    });
  }

  protected remove(tax: Tax): void {
    if (!confirm(`¿Eliminar el impuesto "${tax.description}"?`)) return;
    this.client.delete(tax.id).subscribe({
      next: () => this.refresh(),
      error: () => this.error.set('No se pudo eliminar el impuesto.'),
    });
  }

  protected setPageSize(size: number): void {
    this.pageSize.set(size);
    this.currentPage.set(1);
  }

  protected goToPage(page: number): void {
    this.currentPage.set(page);
  }
}
