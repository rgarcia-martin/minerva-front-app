import { Component, OnInit, computed, inject, signal } from '@angular/core';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';

import { PaymentMethod, PaymentMethodRequest, PaymentMethodType } from './payment-method.model';
import { PaymentMethodClient } from './payment-method.client';

type FormMode = { kind: 'closed' } | { kind: 'create' } | { kind: 'edit'; id: string };

@Component({
  selector: 'app-payment-methods-page',
  imports: [ReactiveFormsModule],
  templateUrl: './payment-methods-page.html',
})
export class PaymentMethodsPage implements OnInit {
  private readonly client = inject(PaymentMethodClient);
  private readonly fb = inject(FormBuilder);

  protected readonly paymentMethods = signal<PaymentMethod[]>([]);
  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly formMode = signal<FormMode>({ kind: 'closed' });

  protected readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(120)]],
    type: ['CASH' as PaymentMethodType, [Validators.required]],
    configuration: ['' as string],
  });

  protected readonly pageSizeOptions = [5, 10, 50];
  protected readonly pageSize = signal(5);
  protected readonly currentPage = signal(1);

  protected readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.paymentMethods().length / this.pageSize()))
  );

  protected readonly activePage = computed(() =>
    Math.min(this.currentPage(), this.totalPages())
  );

  protected readonly paginatedPaymentMethods = computed(() => {
    const all = this.paymentMethods();
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
        this.paymentMethods.set(rows);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('No se pudo cargar el listado de métodos de pago.');
        this.loading.set(false);
      },
    });
  }

  protected openCreate(): void {
    this.form.reset({ name: '', type: 'CASH', configuration: '' });
    this.formMode.set({ kind: 'create' });
  }

  protected openEdit(pm: PaymentMethod): void {
    this.form.reset({
      name: pm.name,
      type: pm.type,
      configuration: pm.configuration ?? '',
    });
    this.formMode.set({ kind: 'edit', id: pm.id });
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

    const raw = this.form.getRawValue();
    const body: PaymentMethodRequest = {
      name: raw.name,
      type: raw.type,
      configuration: raw.configuration?.trim() ? raw.configuration.trim() : null,
    };
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
        this.error.set('No se pudo guardar el método de pago.');
        this.saving.set(false);
      },
    });
  }

  protected remove(pm: PaymentMethod): void {
    if (!confirm(`¿Eliminar el método de pago "${pm.name}"?`)) return;
    this.client.delete(pm.id).subscribe({
      next: () => this.refresh(),
      error: () => this.error.set('No se pudo eliminar el método de pago.'),
    });
  }

  protected typeLabel(type: PaymentMethodType): string {
    const labels: Record<PaymentMethodType, string> = {
      CASH: 'Efectivo',
      CARD: 'Tarjeta',
      GATEWAY: 'Pasarela',
    };
    return labels[type];
  }

  protected setPageSize(size: number): void {
    this.pageSize.set(size);
    this.currentPage.set(1);
  }

  protected goToPage(page: number): void {
    this.currentPage.set(page);
  }
}
