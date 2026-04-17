import {
  Component,
  HostListener,
  OnInit,
  ViewChild,
  computed,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { forkJoin } from 'rxjs';

import { Article, ArticleRequest } from '../catalog/articles/article.model';
import { ArticleClient } from '../catalog/articles/article.client';
import { ArticleForm } from '../catalog/articles/article-form';
import { Tax } from '../catalog/taxes/tax.model';
import { TaxClient } from '../catalog/taxes/tax.client';
import { Location } from '../catalog/locations/location.model';
import { LocationClient } from '../catalog/locations/location.client';
import { Provider } from '../people/providers/provider.model';
import { ProviderClient } from '../people/providers/provider.client';
import { PurchaseClient } from './purchase.client';
import {
  Purchase,
  PurchaseLineRequest,
  PurchaseRequest,
} from './purchase.model';
import {
  computeProfitMargin,
  computeSalePrice,
} from './purchase-line-math';

/** Two distinct usages of the article modal: quick-create vs full-edit. */
type ArticleModalMode = 'create' | 'edit';

/**
 * Each draft represents exactly ONE item that the purchase will generate in
 * inventory. To buy N units of the same article, the user appends N draft
 * lines — quantity is no longer a per-line scalar.
 */
interface LineDraft {
  uid: string;
  basePrice: number;
  profitMargin: number;
  taxId: string;
  salePrice: number;
}

interface ArticleBlock {
  article: Article;
  lines: LineDraft[];
}

let nextLineUid = 0;
const newLineUid = () => `line-${++nextLineUid}`;

@Component({
  selector: 'app-purchase-editor-page',
  imports: [ReactiveFormsModule, ArticleForm],
  templateUrl: './purchase-editor-page.html',
})
export class PurchaseEditorPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);

  private readonly articleClient = inject(ArticleClient);
  private readonly taxClient = inject(TaxClient);
  private readonly locationClient = inject(LocationClient);
  private readonly providerClient = inject(ProviderClient);
  private readonly purchaseClient = inject(PurchaseClient);

  @ViewChild('articleFormRef') private articleFormRef?: ArticleForm;

  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly editingId = signal<string | null>(null);

  protected readonly catalog = signal<Article[]>([]);
  protected readonly taxes = signal<Tax[]>([]);
  protected readonly locations = signal<Location[]>([]);
  protected readonly providers = signal<Provider[]>([]);

  protected readonly blocks = signal<ArticleBlock[]>([]);
  protected readonly articleSearch = signal('');

  /**
   * Per-article "bulk add" counter. Keyed by article id.
   * WHY separate signal: purely transient UI state for the block header input —
   * never persisted with the block itself, so storing it alongside the blocks
   * signal would force a blocks-array rewrite on every keystroke.
   */
  private readonly addLineCounts = signal<Record<string, number>>({});

  /** Null when the article modal is closed. */
  protected readonly articleModalMode = signal<ArticleModalMode | null>(null);
  /** The article being edited in the modal (only set when mode = 'edit'). */
  protected readonly articleModalTarget = signal<Article | null>(null);
  protected readonly savingArticleModal = signal(false);
  protected readonly articleModalError = signal<string | null>(null);

  protected readonly headerForm = this.fb.nonNullable.group({
    code: ['', [Validators.required, Validators.maxLength(60)]],
    providerCode: ['', [Validators.required, Validators.maxLength(60)]],
    providerId: ['', Validators.required],
    locationId: ['', Validators.required],
    createdOn: [todayIsoDate(), Validators.required],
    deposit: [false],
  });

  protected readonly taxesById = computed(() => {
    const map = new Map<string, Tax>();
    for (const t of this.taxes()) map.set(t.id, t);
    return map;
  });

  protected readonly addedArticleIds = computed(
    () => new Set(this.blocks().map((b) => b.article.id)),
  );

  protected readonly searchResults = computed<Article[]>(() => {
    const query = this.articleSearch().trim().toLowerCase();
    if (query === '') return [];
    const added = this.addedArticleIds();
    return this.catalog()
      .filter((a) => !added.has(a.id))
      .filter((a) => {
        const haystack = [a.name, a.code, a.barcode ?? ''].join(' ').toLowerCase();
        return haystack.includes(query);
      })
      .slice(0, 12);
  });

  protected readonly totalCost = computed(() => {
    let total = 0;
    for (const block of this.blocks()) {
      for (const line of block.lines) {
        total += line.basePrice;
      }
    }
    return Math.round(total * 100) / 100;
  });

  protected readonly hasUnsavedChanges = computed(
    () => this.blocks().length > 0 || this.headerForm.dirty,
  );

  /**
   * Child candidates for the article edit modal: all catalog articles except
   * the one being edited (prevents direct self-reference).
   */
  protected readonly articleModalChildCandidates = computed<Article[]>(() => {
    const target = this.articleModalTarget();
    if (!target) return this.catalog();
    return this.catalog().filter((a) => a.id !== target.id);
  });

  ngOnInit(): void {
    this.loadCollections();
  }

  // ─── data loading ────────────────────────────────────────────────────────

  private loadCollections(): void {
    this.loading.set(true);
    this.error.set(null);

    forkJoin({
      articles: this.articleClient.list(),
      taxes: this.taxClient.list(),
      locations: this.locationClient.list(),
      providers: this.providerClient.list(),
    }).subscribe({
      next: ({ articles, taxes, locations, providers }) => {
        this.catalog.set(articles);
        this.taxes.set(taxes);
        this.locations.set(locations);
        this.providers.set(providers);
        this.headerForm.patchValue(
          {
            providerId: providers[0]?.id ?? '',
            locationId: locations[0]?.id ?? '',
          },
          { emitEvent: false },
        );

        const editingId = this.route.snapshot.paramMap.get('id');
        if (editingId) {
          this.loadExistingPurchase(editingId);
        } else {
          this.loading.set(false);
        }
      },
      error: () => {
        this.error.set('No se pudieron cargar los datos del catálogo.');
        this.loading.set(false);
      },
    });
  }

  private loadExistingPurchase(id: string): void {
    this.purchaseClient.get(id).subscribe({
      next: (purchase) => {
        this.editingId.set(purchase.id);
        this.hydrateFromPurchase(purchase);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('No se pudo cargar la compra.');
        this.loading.set(false);
      },
    });
  }

  private hydrateFromPurchase(purchase: Purchase): void {
    this.headerForm.patchValue(
      {
        code: purchase.code,
        providerCode: purchase.providerCode,
        providerId: purchase.providerId,
        locationId: purchase.locationId,
        createdOn: (purchase.createdOn ?? '').slice(0, 10) || todayIsoDate(),
        deposit: purchase.deposit,
      },
      { emitEvent: false },
    );

    const articlesById = new Map(this.catalog().map((a) => [a.id, a]));
    const blocks: ArticleBlock[] = [];
    for (const line of purchase.lines) {
      const article = articlesById.get(line.articleId);
      if (!article) continue;
      let block = blocks.find((b) => b.article.id === article.id);
      if (!block) {
        block = { article, lines: [] };
        blocks.push(block);
      }
      const taxRate = this.taxesById().get(line.taxId)?.rate ?? 0;
      // Expand legacy lines (quantity > 1) into N one-item drafts so the
      // editor always represents one item per line.
      const times = Math.max(1, Math.floor(line.quantity || 1));
      for (let i = 0; i < times; i++) {
        block.lines.push({
          uid: newLineUid(),
          basePrice: line.buyPrice,
          profitMargin: line.profitMargin,
          taxId: line.taxId,
          salePrice: computeSalePrice(line.buyPrice, line.profitMargin, taxRate),
        });
      }
    }
    this.blocks.set(blocks);
  }

  // ─── article search / add ────────────────────────────────────────────────

  protected onSearchInput(value: string): void {
    this.articleSearch.set(value);
  }

  protected clearSearch(): void {
    this.articleSearch.set('');
  }

  protected addArticle(article: Article): void {
    const existing = this.blocks().find((b) => b.article.id === article.id);
    if (existing) {
      this.addLineToArticle(article.id);
    } else {
      const block: ArticleBlock = {
        article,
        lines: [this.createDefaultLine(article)],
      };
      this.blocks.set([...this.blocks(), block]);
    }
    this.clearSearch();
  }

  private createDefaultLine(article: Article): LineDraft {
    const taxId = article.taxId ?? this.taxes()[0]?.id ?? '';
    const taxRate = this.taxesById().get(taxId)?.rate ?? 0;
    const basePrice = article.basePrice ?? 0;
    const retail = article.retailPrice ?? 0;
    const profitMargin =
      basePrice > 0 && retail > 0
        ? computeProfitMargin(basePrice, retail, taxRate)
        : 0;
    const salePrice = computeSalePrice(basePrice, profitMargin, taxRate);
    return {
      uid: newLineUid(),
      basePrice,
      profitMargin,
      taxId,
      salePrice,
    };
  }

  /** Returns the current "add N lines at once" counter for a given block, defaulting to 1. */
  protected addLineCountFor(articleId: string): number {
    return this.addLineCounts()[articleId] ?? 1;
  }

  protected setAddLineCount(articleId: string, raw: string | number): void {
    const value = typeof raw === 'number' ? raw : Number(raw);
    const count = Number.isFinite(value) && value >= 1 ? Math.floor(value) : 1;
    this.addLineCounts.set({ ...this.addLineCounts(), [articleId]: count });
  }

  protected addLineToArticle(articleId: string): void {
    const count = this.addLineCountFor(articleId);
    this.blocks.set(
      this.blocks().map((block) => {
        if (block.article.id !== articleId) return block;
        const extras: LineDraft[] = [];
        for (let i = 0; i < count; i++) {
          extras.push(this.createDefaultLine(block.article));
        }
        return { ...block, lines: [...block.lines, ...extras] };
      }),
    );
  }

  protected removeArticle(articleId: string): void {
    if (!confirm('¿Quitar este artículo de la compra y todas sus líneas?')) return;
    this.blocks.set(this.blocks().filter((b) => b.article.id !== articleId));
  }

  protected removeLine(articleId: string, uid: string): void {
    this.blocks.set(
      this.blocks()
        .map((block) => {
          if (block.article.id !== articleId) return block;
          return { ...block, lines: block.lines.filter((l) => l.uid !== uid) };
        })
        .filter((b) => b.lines.length > 0),
    );
  }

  protected cloneLine(articleId: string, uid: string): void {
    this.blocks.set(
      this.blocks().map((block) => {
        if (block.article.id !== articleId) return block;
        const source = block.lines.find((l) => l.uid === uid);
        if (!source) return block;
        const clone: LineDraft = { ...source, uid: newLineUid() };
        return { ...block, lines: [...block.lines, clone] };
      }),
    );
  }

  // ─── reactive line math ──────────────────────────────────────────────────

  protected onBasePriceChange(line: LineDraft, raw: string): void {
    line.basePrice = clampNumber(raw);
    line.salePrice = computeSalePrice(line.basePrice, line.profitMargin, this.taxRateFor(line));
    this.touch();
  }

  protected onProfitMarginChange(line: LineDraft, raw: string): void {
    line.profitMargin = clampNumber(raw);
    line.salePrice = computeSalePrice(line.basePrice, line.profitMargin, this.taxRateFor(line));
    this.touch();
  }

  protected onTaxChange(line: LineDraft, taxId: string): void {
    line.taxId = taxId;
    line.salePrice = computeSalePrice(line.basePrice, line.profitMargin, this.taxRateFor(line));
    this.touch();
  }

  protected onSalePriceChange(line: LineDraft, raw: string): void {
    line.salePrice = clampNumber(raw);
    line.profitMargin = computeProfitMargin(line.basePrice, line.salePrice, this.taxRateFor(line));
    this.touch();
  }

  protected taxRateFor(line: LineDraft): number {
    return this.taxesById().get(line.taxId)?.rate ?? 0;
  }

  protected lineSubtotal(line: LineDraft): number {
    return Math.round(line.basePrice * 100) / 100;
  }

  private touch(): void {
    this.blocks.set([...this.blocks()]);
  }

  // ─── article modal (create / edit) ──────────────────────────────────────

  /** Open the modal for quick-creating a new article. */
  protected openArticleCreate(): void {
    this.articleModalError.set(null);
    this.articleModalTarget.set(null);
    this.articleModalMode.set('create');
  }

  /** Open the modal pre-filled to edit an existing article's full definition. */
  protected openArticleEdit(article: Article): void {
    this.articleModalError.set(null);
    this.articleModalTarget.set(article);
    this.articleModalMode.set('edit');
    // Defer form reset until the ViewChild is rendered.
    setTimeout(() => this.articleFormRef?.reset(article));
  }

  protected closeArticleModal(): void {
    this.articleModalMode.set(null);
    this.articleModalTarget.set(null);
    this.articleModalError.set(null);
  }

  /** Handles ArticleRequest from the modal form for both create and edit modes. */
  protected onArticleModalSave(body: ArticleRequest): void {
    const mode = this.articleModalMode();
    if (!mode) return;

    this.savingArticleModal.set(true);
    this.articleModalError.set(null);

    const target = this.articleModalTarget();
    const request$ = target
      ? this.articleClient.update(target.id, body)
      : this.articleClient.create(body);

    request$.subscribe({
      next: (saved) => {
        this.savingArticleModal.set(false);

        if (target) {
          // Update the catalog and any existing blocks that reference this article.
          this.catalog.set(this.catalog().map((a) => (a.id === saved.id ? saved : a)));
          this.blocks.set(
            this.blocks().map((b) => (b.article.id === saved.id ? { ...b, article: saved } : b)),
          );
        } else {
          // New article: add to catalog and auto-add it as a purchase line.
          this.catalog.set([saved, ...this.catalog()]);
          this.addArticle(saved);
        }

        this.closeArticleModal();
      },
      error: () => {
        this.savingArticleModal.set(false);
        this.articleModalError.set('No se pudo guardar el artículo.');
      },
    });
  }

  // ─── save purchase ────────────────────────────────────────────────────────

  protected canSave(): boolean {
    if (this.headerForm.invalid) return false;
    if (this.blocks().length === 0) return false;
    for (const block of this.blocks()) {
      for (const line of block.lines) {
        if (!line.taxId) return false;
        if (!Number.isFinite(line.basePrice) || line.basePrice < 0) return false;
      }
    }
    return true;
  }

  protected save(): void {
    if (!this.canSave()) {
      this.headerForm.markAllAsTouched();
      this.error.set('Revisa los datos antes de guardar.');
      return;
    }

    const header = this.headerForm.getRawValue();
    const lines: PurchaseLineRequest[] = [];
    // Each draft maps to exactly one purchase line with quantity=1 — the backend
    // still accepts the legacy `quantity` field in its request contract.
    for (const block of this.blocks()) {
      for (const line of block.lines) {
        lines.push({
          articleId: block.article.id,
          quantity: 1,
          buyPrice: line.basePrice,
          profitMargin: line.profitMargin,
          taxId: line.taxId,
        });
      }
    }

    const body: PurchaseRequest = {
      createdOn: `${header.createdOn}T00:00:00`,
      finishDate: null,
      state: null,
      code: header.code,
      providerCode: header.providerCode,
      providerId: header.providerId,
      locationId: header.locationId,
      deposit: header.deposit,
      lines,
    };

    this.saving.set(true);
    this.error.set(null);

    const editingId = this.editingId();
    const request$ = editingId
      ? this.purchaseClient.update(editingId, body)
      : this.purchaseClient.create(body);

    request$.subscribe({
      next: (purchase) => {
        this.saving.set(false);
        this.router.navigate(['/purchases', purchase.id]);
      },
      error: () => {
        this.saving.set(false);
        this.error.set('No se pudo guardar la compra.');
      },
    });
  }

  protected cancel(): void {
    this.router.navigate(['/purchases']);
  }

  @HostListener('window:beforeunload', ['$event'])
  protected onBeforeUnload(event: BeforeUnloadEvent): void {
    if (this.hasUnsavedChanges() && !this.saving()) {
      event.preventDefault();
      event.returnValue = '';
    }
  }
}

const todayIsoDate = (): string => {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const clampNumber = (raw: string | number): number => {
  const value = typeof raw === 'number' ? raw : Number(raw);
  if (!Number.isFinite(value) || value < 0) return 0;
  return Math.round(value * 100) / 100;
};
