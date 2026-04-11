import {
  Component,
  HostListener,
  OnInit,
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

import { Article } from '../catalog/articles/article.model';
import { ArticleClient } from '../catalog/articles/article.client';
import { Tax } from '../catalog/taxes/tax.model';
import { TaxClient } from '../catalog/taxes/tax.client';
import { Location } from '../catalog/locations/location.model';
import { LocationClient } from '../catalog/locations/location.client';
import { Provider } from '../people/providers/provider.model';
import { ProviderClient } from '../people/providers/provider.client';

import { ArticleQuickCreateForm } from './article-quick-create-form';
import { PurchaseClient } from './purchase.client';
import {
  Purchase,
  PurchaseLineRequest,
  PurchaseRequest,
} from './purchase.model';
import {
  computeProfitMargin,
  computeSalePrice,
  lineTotal,
} from './purchase-line-math';

interface LineDraft {
  uid: string;
  quantity: number;
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
  imports: [ReactiveFormsModule, ArticleQuickCreateForm],
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
  protected readonly showQuickCreate = signal(false);

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

  /** Articles in the global catalog matching the search and not yet added. */
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
        total += lineTotal(line.basePrice, line.quantity);
      }
    }
    return Math.round(total * 100) / 100;
  });

  protected readonly hasUnsavedChanges = computed(
    () => this.blocks().length > 0 || this.headerForm.dirty,
  );

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
      block.lines.push({
        uid: newLineUid(),
        quantity: line.quantity,
        basePrice: line.buyPrice,
        profitMargin: line.profitMargin,
        taxId: line.taxId,
        salePrice: computeSalePrice(line.buyPrice, line.profitMargin, taxRate),
      });
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
    // If the article carries a sensible PVP, derive the margin from it. Otherwise
    // start with margin = 0 and let the user type.
    const profitMargin =
      basePrice > 0 && retail > 0
        ? computeProfitMargin(basePrice, retail, taxRate)
        : 0;
    const salePrice = computeSalePrice(basePrice, profitMargin, taxRate);
    return {
      uid: newLineUid(),
      quantity: 1,
      basePrice,
      profitMargin,
      taxId,
      salePrice,
    };
  }

  protected addLineToArticle(articleId: string): void {
    this.blocks.set(
      this.blocks().map((block) => {
        if (block.article.id !== articleId) return block;
        return {
          ...block,
          lines: [...block.lines, this.createDefaultLine(block.article)],
        };
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

  protected onQuantityChange(line: LineDraft, raw: string): void {
    const value = Math.max(1, Math.floor(Number(raw) || 1));
    line.quantity = value;
    this.touch();
  }

  protected onBasePriceChange(line: LineDraft, raw: string): void {
    line.basePrice = clampNumber(raw);
    line.salePrice = computeSalePrice(
      line.basePrice,
      line.profitMargin,
      this.taxRateFor(line),
    );
    this.touch();
  }

  protected onProfitMarginChange(line: LineDraft, raw: string): void {
    line.profitMargin = clampNumber(raw);
    line.salePrice = computeSalePrice(
      line.basePrice,
      line.profitMargin,
      this.taxRateFor(line),
    );
    this.touch();
  }

  protected onTaxChange(line: LineDraft, taxId: string): void {
    line.taxId = taxId;
    line.salePrice = computeSalePrice(
      line.basePrice,
      line.profitMargin,
      this.taxRateFor(line),
    );
    this.touch();
  }

  protected onSalePriceChange(line: LineDraft, raw: string): void {
    line.salePrice = clampNumber(raw);
    line.profitMargin = computeProfitMargin(
      line.basePrice,
      line.salePrice,
      this.taxRateFor(line),
    );
    this.touch();
  }

  protected taxRateFor(line: LineDraft): number {
    return this.taxesById().get(line.taxId)?.rate ?? 0;
  }

  protected lineSubtotal(line: LineDraft): number {
    return lineTotal(line.basePrice, line.quantity);
  }

  /** Triggers signal change detection on `blocks` after mutating a line in place. */
  private touch(): void {
    this.blocks.set([...this.blocks()]);
  }

  // ─── article quick-create ────────────────────────────────────────────────

  protected openQuickCreate(): void {
    this.showQuickCreate.set(true);
  }

  protected closeQuickCreate(): void {
    this.showQuickCreate.set(false);
  }

  protected onArticleCreated(article: Article): void {
    this.catalog.set([article, ...this.catalog()]);
    this.showQuickCreate.set(false);
    this.addArticle(article);
  }

  // ─── save ────────────────────────────────────────────────────────────────

  protected canSave(): boolean {
    if (this.headerForm.invalid) return false;
    if (this.blocks().length === 0) return false;
    for (const block of this.blocks()) {
      for (const line of block.lines) {
        if (line.quantity < 1) return false;
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
    for (const block of this.blocks()) {
      for (const line of block.lines) {
        lines.push({
          articleId: block.article.id,
          quantity: line.quantity,
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
