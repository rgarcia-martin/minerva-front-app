import { Component, OnInit, computed, inject, signal, viewChild } from '@angular/core';
import { forkJoin } from 'rxjs';

import { Tax } from '../taxes/tax.model';
import { TaxClient } from '../taxes/tax.client';
import { Article, ArticleRequest } from './article.model';
import { ArticleClient } from './article.client';
import { ArticleForm } from './article-form';

type FormMode = { kind: 'closed' } | { kind: 'create' } | { kind: 'edit'; id: string };

@Component({
  selector: 'app-articles-page',
  imports: [ArticleForm],
  templateUrl: './articles-page.html',
})
export class ArticlesPage implements OnInit {
  private readonly client = inject(ArticleClient);
  private readonly taxClient = inject(TaxClient);

  protected readonly mainForm = viewChild<ArticleForm>('mainForm');
  protected readonly childFormRef = viewChild<ArticleForm>('childFormRef');

  protected readonly articles = signal<Article[]>([]);
  protected readonly taxes = signal<Tax[]>([]);
  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly formMode = signal<FormMode>({ kind: 'closed' });

  protected readonly childFormOpen = signal(false);
  protected readonly savingChild = signal(false);
  protected readonly childError = signal<string | null>(null);

  protected readonly taxesById = computed(() => {
    const map = new Map<string, Tax>();
    for (const t of this.taxes()) map.set(t.id, t);
    return map;
  });

  protected readonly pageSizeOptions = [5, 10, 50];
  protected readonly pageSize = signal(5);
  protected readonly currentPage = signal(1);

  protected readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.articles().length / this.pageSize()))
  );

  protected readonly activePage = computed(() =>
    Math.min(this.currentPage(), this.totalPages())
  );

  protected readonly paginatedArticles = computed(() => {
    const all = this.articles();
    const size = this.pageSize();
    const start = (this.activePage() - 1) * size;
    return all.slice(start, start + size);
  });

  /**
   * Candidate articles for the child dropdown.
   * WHY computed: ensures the list recomputes deterministically when either
   * `articles` or `formMode` change, and hands a stable reference to the child
   * form input until one of those dependencies actually changes.
   */
  protected readonly childCandidatesList = computed<Article[]>(() => {
    const mode = this.formMode();
    const editingId = mode.kind === 'edit' ? mode.id : null;
    return this.articles().filter((a) => a.id !== editingId);
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
    this.error.set(null);
    this.formMode.set({ kind: 'create' });
    this.mainForm()?.reset(null);
  }

  protected openEdit(article: Article): void {
    this.error.set(null);
    // Close any residual nested child-creation form so it does not leak state
    // from the previously edited article into the new edit session.
    this.closeChildForm();
    this.formMode.set({ kind: 'edit', id: article.id });
    this.mainForm()?.reset(article);
  }

  protected closeForm(): void {
    this.formMode.set({ kind: 'closed' });
    this.error.set(null);
    this.closeChildForm();
  }

  protected submit(body: ArticleRequest): void {
    const mode = this.formMode();
    if (mode.kind === 'closed') return;

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

  protected openChildForm(): void {
    this.childError.set(null);
    this.childFormOpen.set(true);
    this.childFormRef()?.reset(null);
  }

  protected closeChildForm(): void {
    this.childFormOpen.set(false);
    this.childError.set(null);
  }

  protected submitChild(body: ArticleRequest): void {
    this.savingChild.set(true);
    this.childError.set(null);

    this.client.create(body).subscribe({
      next: (created) => {
        this.savingChild.set(false);
        // Add to local list so the main form's candidate dropdown picks it up immediately.
        this.articles.update((list) => [...list, created]);
        // Append a pre-filled row in the main form for the newly created child.
        this.mainForm()?.addChild(created.id);
        this.closeChildForm();
      },
      error: () => {
        this.savingChild.set(false);
        this.childError.set('No se pudo crear el artículo hijo.');
      },
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
