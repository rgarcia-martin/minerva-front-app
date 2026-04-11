import { Component, OnInit, computed, inject, signal } from '@angular/core';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { forkJoin } from 'rxjs';

import { Tax } from '../taxes/tax.model';
import { TaxClient } from '../taxes/tax.client';
import { Article, ArticleRequest } from './article.model';
import { ArticleClient } from './article.client';

type FormMode = { kind: 'closed' } | { kind: 'create' } | { kind: 'edit'; id: string };

@Component({
  selector: 'app-articles-page',
  imports: [ReactiveFormsModule],
  templateUrl: './articles-page.html',
})
export class ArticlesPage implements OnInit {
  private readonly client = inject(ArticleClient);
  private readonly taxClient = inject(TaxClient);
  private readonly fb = inject(FormBuilder);

  protected readonly articles = signal<Article[]>([]);
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
    code: ['', [Validators.required, Validators.maxLength(60)]],
    barcode: [''],
    image: [''],
    description: [''],
    taxId: ['', Validators.required],
    basePrice: [0, [Validators.required, Validators.min(0)]],
    retailPrice: [0, [Validators.required, Validators.min(0)]],
    canHaveChildren: [false],
    numberOfChildren: [0, [Validators.min(0)]],
    childArticleId: [''],
  });

  ngOnInit(): void {
    this.refresh();
  }

  protected refresh(): void {
    this.loading.set(true);
    this.error.set(null);
    forkJoin({
      articles: this.client.list(),
      taxes: this.taxClient.list(),
    }).subscribe({
      next: ({ articles, taxes }) => {
        this.articles.set(articles);
        this.taxes.set(taxes);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('No se pudieron cargar los artículos.');
        this.loading.set(false);
      },
    });
  }

  protected openCreate(): void {
    this.form.reset({
      name: '',
      code: '',
      barcode: '',
      image: '',
      description: '',
      taxId: this.taxes()[0]?.id ?? '',
      basePrice: 0,
      retailPrice: 0,
      canHaveChildren: false,
      numberOfChildren: 0,
      childArticleId: '',
    });
    this.formMode.set({ kind: 'create' });
  }

  protected openEdit(article: Article): void {
    this.form.reset({
      name: article.name,
      code: article.code,
      barcode: article.barcode ?? '',
      image: article.image ?? '',
      description: article.description ?? '',
      taxId: article.taxId,
      basePrice: article.basePrice,
      retailPrice: article.retailPrice,
      canHaveChildren: article.canHaveChildren,
      numberOfChildren: article.numberOfChildren ?? 0,
      childArticleId: article.childArticleId ?? '',
    });
    this.formMode.set({ kind: 'edit', id: article.id });
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
    const editingId = mode.kind === 'edit' ? mode.id : null;

    const body: ArticleRequest = {
      name: raw.name,
      code: raw.code,
      barcode: raw.barcode.trim() === '' ? null : raw.barcode,
      image: raw.image.trim() === '' ? null : raw.image,
      description: raw.description.trim() === '' ? null : raw.description,
      taxId: raw.taxId,
      basePrice: raw.basePrice,
      retailPrice: raw.retailPrice,
      canHaveChildren: raw.canHaveChildren,
      numberOfChildren: raw.canHaveChildren ? raw.numberOfChildren : null,
      childArticleId:
        raw.canHaveChildren && raw.childArticleId.trim() !== ''
          ? raw.childArticleId
          : null,
    };

    // Guard: en edición, no permitir que un artículo se referencie a sí mismo
    if (editingId && body.childArticleId === editingId) {
      this.error.set('Un artículo no puede ser su propio hijo.');
      return;
    }

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
        this.error.set('No se pudo guardar el artículo.');
        this.saving.set(false);
      },
    });
  }

  protected remove(article: Article): void {
    if (!confirm(`¿Eliminar el artículo "${article.name}"?`)) return;
    this.client.delete(article.id).subscribe({
      next: () => this.refresh(),
      error: () => this.error.set('No se pudo eliminar el artículo.'),
    });
  }

  protected taxLabel(taxId: string): string {
    const t = this.taxesById().get(taxId);
    return t ? `${t.description} (${t.rate} %)` : '—';
  }

  protected childCandidates(): Article[] {
    const mode = this.formMode();
    const editingId = mode.kind === 'edit' ? mode.id : null;
    return this.articles().filter((a) => a.id !== editingId);
  }
}
