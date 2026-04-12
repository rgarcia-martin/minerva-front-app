import { Component, OnInit, computed, inject, signal } from '@angular/core';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { forkJoin } from 'rxjs';

import { Tax } from '../taxes/tax.model';
import { TaxClient } from '../taxes/tax.client';
import { FreeConcept, FreeConceptRequest } from './free-concept.model';
import { FreeConceptClient } from './free-concept.client';

type FormMode = { kind: 'closed' } | { kind: 'create' } | { kind: 'edit'; id: string };

@Component({
  selector: 'app-free-concepts-page',
  imports: [ReactiveFormsModule],
  templateUrl: './free-concepts-page.html',
})
export class FreeConceptsPage implements OnInit {
  private readonly client = inject(FreeConceptClient);
  private readonly taxClient = inject(TaxClient);
  private readonly fb = inject(FormBuilder);

  protected readonly concepts = signal<FreeConcept[]>([]);
  protected readonly taxes = signal<Tax[]>([]);
  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly formMode = signal<FormMode>({ kind: 'closed' });

  protected readonly taxesById = computed(() => {
    const map = new Map<string, Tax>();
    for (const t of this.taxes()) map.set(t.id, t);
    return map;
  });

  protected readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(120)]],
    barcode: ['', [Validators.required, Validators.maxLength(60)]],
    price: [0, [Validators.required, Validators.min(0)]],
    taxId: ['', Validators.required],
    description: [''],
  });

  protected readonly pageSizeOptions = [5, 10, 50];
  protected readonly pageSize = signal(5);
  protected readonly currentPage = signal(1);

  protected readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.concepts().length / this.pageSize()))
  );

  protected readonly activePage = computed(() =>
    Math.min(this.currentPage(), this.totalPages())
  );

  protected readonly paginatedConcepts = computed(() => {
    const all = this.concepts();
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
      concepts: this.client.list(),
      taxes: this.taxClient.list(),
    }).subscribe({
      next: ({ concepts, taxes }) => {
        this.concepts.set(concepts);
        this.taxes.set(taxes);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('No se pudieron cargar los conceptos libres.');
        this.loading.set(false);
      },
    });
  }

  protected openCreate(): void {
    this.form.reset({
      name: '',
      barcode: '',
      price: 0,
      taxId: this.taxes()[0]?.id ?? '',
      description: '',
    });
    this.formMode.set({ kind: 'create' });
  }

  protected openEdit(concept: FreeConcept): void {
    this.form.reset({
      name: concept.name,
      barcode: concept.barcode,
      price: concept.price,
      taxId: concept.taxId,
      description: concept.description ?? '',
    });
    this.formMode.set({ kind: 'edit', id: concept.id });
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
    const body: FreeConceptRequest = {
      name: raw.name,
      barcode: raw.barcode,
      price: raw.price,
      taxId: raw.taxId,
      description: raw.description.trim() === '' ? null : raw.description,
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
        this.error.set('No se pudo guardar el concepto.');
        this.saving.set(false);
      },
    });
  }

  protected remove(concept: FreeConcept): void {
    if (!confirm(`¿Eliminar el concepto "${concept.name}"?`)) return;
    this.client.delete(concept.id).subscribe({
      next: () => this.refresh(),
      error: () => this.error.set('No se pudo eliminar el concepto.'),
    });
  }

  protected taxLabel(taxId: string): string {
    const t = this.taxesById().get(taxId);
    return t ? `${t.description} (${t.rate} %)` : '—';
  }

  protected setPageSize(size: number): void {
    this.pageSize.set(size);
    this.currentPage.set(1);
  }

  protected goToPage(page: number): void {
    this.currentPage.set(page);
  }
}
