import { Component, OnInit, computed, inject, signal } from '@angular/core';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';

import { Location, LocationRequest } from './location.model';
import { LocationClient } from './location.client';

type FormMode = { kind: 'closed' } | { kind: 'create' } | { kind: 'edit'; id: string };

@Component({
  selector: 'app-locations-page',
  imports: [ReactiveFormsModule],
  templateUrl: './locations-page.html',
})
export class LocationsPage implements OnInit {
  private readonly client = inject(LocationClient);
  private readonly fb = inject(FormBuilder);

  protected readonly locations = signal<Location[]>([]);
  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly formMode = signal<FormMode>({ kind: 'closed' });

  protected readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(120)]],
    description: [''],
  });

  protected readonly pageSizeOptions = [5, 10, 50];
  protected readonly pageSize = signal(5);
  protected readonly currentPage = signal(1);

  protected readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.locations().length / this.pageSize()))
  );

  protected readonly activePage = computed(() =>
    Math.min(this.currentPage(), this.totalPages())
  );

  protected readonly paginatedLocations = computed(() => {
    const all = this.locations();
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
        this.locations.set(rows);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('No se pudieron cargar las localizaciones.');
        this.loading.set(false);
      },
    });
  }

  protected openCreate(): void {
    this.form.reset({ name: '', description: '' });
    this.formMode.set({ kind: 'create' });
  }

  protected openEdit(loc: Location): void {
    this.form.reset({ name: loc.name, description: loc.description ?? '' });
    this.formMode.set({ kind: 'edit', id: loc.id });
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
    const body: LocationRequest = {
      name: raw.name,
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
        this.error.set('No se pudo guardar la localización.');
        this.saving.set(false);
      },
    });
  }

  protected remove(loc: Location): void {
    if (!confirm(`¿Eliminar la localización "${loc.name}"?`)) return;
    this.client.delete(loc.id).subscribe({
      next: () => this.refresh(),
      error: () => this.error.set('No se pudo eliminar la localización.'),
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
