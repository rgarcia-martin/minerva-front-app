import {
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { forkJoin } from 'rxjs';

import { Article } from '../catalog/articles/article.model';
import { FreeConcept } from '../catalog/free-concepts/free-concept.model';
import { PaymentMethod } from '../catalog/payment-methods/payment-method.model';
import { Tax } from '../catalog/taxes/tax.model';
import { Item } from '../inventory/items/item.model';
import { User } from '../people/users/user.model';
import { Sale, SaleState, SaleRequest, SaleLineRequest } from './sale.model';
import { lineSubtotal, saleTotal } from './sale-line-math';
import { TaxClient } from '../catalog/taxes/tax.client';
import { PaymentMethodClient } from '../catalog/payment-methods/payment-method.client';
import { UserClient } from '../people/users/user.client';
import { ArticleClient } from '../catalog/articles/article.client';
import { FreeConceptClient } from '../catalog/free-concepts/free-concept.client';
import { ItemClient } from '../inventory/items/item.client';
import { SaleClient } from './sale.client';

/**
 * Discriminated union type for search results combining both articles and free-concepts.
 * Supports filtering by availability and matching across multiple fields.
 */
type SearchHit =
  | { kind: 'article'; article: Article; availableCount: number }
  | { kind: 'free-concept'; freeConcept: FreeConcept };

/**
 * Each line represents exactly ONE sellable unit: either an inventory item
 * (quantity always 1) or a free concept (quantity ≥ 1). Mirrors the XOR
 * constraint in the backend aggregate SaleLine.
 */
interface SaleLineDraft {
  uid: string;
  itemId: string | null;
  freeConceptId: string | null;
  displayName: string;
  quantity: number;
  unitPrice: number;
  taxId: string;
}

let nextLineUid = 0;
const newLineUid = () => `sale-line-${++nextLineUid}`;

@Component({
  selector: 'app-sales-editor-page',
  imports: [ReactiveFormsModule],
  templateUrl: './sales-editor-page.html',
})
export class SalesEditorPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly taxClient = inject(TaxClient);
  private readonly paymentMethodClient = inject(PaymentMethodClient);
  private readonly userClient = inject(UserClient);
  private readonly articleClient = inject(ArticleClient);
  private readonly freeConceptClient = inject(FreeConceptClient);
  private readonly itemClient = inject(ItemClient);
  private readonly saleClient = inject(SaleClient);

  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly viewingId = signal<string | null>(null);
  protected readonly loadedSale = signal<Sale | null>(null);

  protected readonly taxes = signal<Tax[]>([]);
  protected readonly paymentMethods = signal<PaymentMethod[]>([]);
  protected readonly employees = signal<User[]>([]);
  protected readonly articles = signal<Article[]>([]);
  protected readonly freeConcepts = signal<FreeConcept[]>([]);
  protected readonly allItems = signal<Item[]>([]);
  protected readonly availableItems = signal<Item[]>([]);

  protected readonly lines = signal<SaleLineDraft[]>([]);
  protected readonly lineSearch = signal('');

  protected readonly totalAmount = computed(() =>
    saleTotal(this.lines().map((l) => ({ unitPrice: l.unitPrice, quantity: l.quantity }))),
  );

  protected readonly headerForm = this.fb.nonNullable.group({
    employeeId: ['', [Validators.required]],
    paymentMethodId: ['', [Validators.required]],
  });

  protected readonly canSave = computed(
    () => this.lines().length > 0 && this.headerForm.valid,
  );

  protected readonly searchResults = computed<SearchHit[]>(() => {
    const q = this.lineSearch().trim().toLowerCase();
    if (q === '') return [];

    const items = this.availableItems();
    const availableByArticle = new Map<string, number>();
    for (const item of items) {
      availableByArticle.set(
        item.articleId,
        (availableByArticle.get(item.articleId) ?? 0) + 1,
      );
    }

    const articleHits: SearchHit[] = this.articles()
      .filter((a) => {
        const count = availableByArticle.get(a.id) ?? 0;
        if (count === 0) return false;
        return (
          a.name.toLowerCase().includes(q) ||
          a.code.toLowerCase().includes(q) ||
          (a.barcode ?? '').toLowerCase().includes(q)
        );
      })
      .map((article) => ({
        kind: 'article',
        article,
        availableCount: availableByArticle.get(article.id) ?? 0,
      }));

    const freeConceptHits: SearchHit[] = this.freeConcepts()
      .filter(
        (fc) =>
          fc.name.toLowerCase().includes(q) ||
          fc.barcode.toLowerCase().includes(q),
      )
      .map((freeConcept) => ({ kind: 'free-concept', freeConcept }));

    return [...articleHits, ...freeConceptHits];
  });

  ngOnInit(): void {
    this.loading.set(true);
    this.error.set(null);

    const idParam = this.route.snapshot.paramMap.get('id');

    forkJoin({
      taxes: this.taxClient.list(),
      paymentMethods: this.paymentMethodClient.list(),
      employees: this.userClient.list(),
      articles: this.articleClient.list(),
      freeConcepts: this.freeConceptClient.list(),
      items: this.itemClient.list(),
    }).subscribe({
      next: ({ taxes, paymentMethods, employees, articles, freeConcepts, items }) => {
        this.taxes.set(taxes);
        this.paymentMethods.set(paymentMethods);
        this.employees.set(employees.filter((u) => u.active));
        this.articles.set(articles);
        this.freeConcepts.set(freeConcepts);
        this.allItems.set(items);
        this.availableItems.set(items.filter((i) => i.itemStatus === 'AVAILABLE'));

        if (idParam) {
          this.viewingId.set(idParam);
          this.saleClient.get(idParam).subscribe({
            next: (sale) => {
              this.loadedSale.set(sale);
              this.loading.set(false);
            },
            error: () => {
              this.error.set('No se pudo cargar la venta.');
              this.loading.set(false);
            },
          });
        } else {
          this.loading.set(false);
        }
      },
      error: () => {
        this.error.set('No se pudieron cargar los datos.');
        this.loading.set(false);
      },
    });
  }

  protected onSearchInput(value: string): void {
    this.lineSearch.set(value);
  }

  protected clearSearch(): void {
    this.lineSearch.set('');
  }

  protected addArticleLine(article: Article): void {
    const usedItemIds = new Set(
      this.lines()
        .map((l) => l.itemId)
        .filter((id): id is string => id !== null),
    );
    const item = this.availableItems().find(
      (i) => i.articleId === article.id && !usedItemIds.has(i.id),
    );
    if (!item) {
      this.error.set(`No quedan items disponibles para "${article.name}".`);
      return;
    }
    this.error.set(null);
    const draft: SaleLineDraft = {
      uid: newLineUid(),
      itemId: item.id,
      freeConceptId: null,
      displayName: article.name,
      quantity: 1,
      unitPrice: article.retailPrice,
      taxId: article.taxId,
    };
    this.lines.set([...this.lines(), draft]);
    this.lineSearch.set('');
  }

  protected addFreeConceptLine(freeConcept: FreeConcept): void {
    this.error.set(null);
    const draft: SaleLineDraft = {
      uid: newLineUid(),
      itemId: null,
      freeConceptId: freeConcept.id,
      displayName: freeConcept.name,
      quantity: 1,
      unitPrice: freeConcept.price,
      taxId: freeConcept.taxId,
    };
    this.lines.set([...this.lines(), draft]);
    this.lineSearch.set('');
  }

  protected updateLineQuantity(uid: string, raw: string | number): void {
    const value = typeof raw === 'number' ? raw : Number(raw);
    const qty = Number.isFinite(value) && value >= 1 ? Math.floor(value) : 1;
    this.lines.set(
      this.lines().map((l) => (l.uid === uid ? { ...l, quantity: qty } : l)),
    );
  }

  protected updateLinePrice(uid: string, raw: string | number): void {
    const value = typeof raw === 'number' ? raw : Number(raw);
    const price = Number.isFinite(value) && value >= 0 ? value : 0;
    this.lines.set(
      this.lines().map((l) => (l.uid === uid ? { ...l, unitPrice: price } : l)),
    );
  }

  protected updateLineTax(uid: string, taxId: string): void {
    this.lines.set(
      this.lines().map((l) => (l.uid === uid ? { ...l, taxId } : l)),
    );
  }

  protected removeLine(uid: string): void {
    this.lines.set(this.lines().filter((l) => l.uid !== uid));
  }

  protected lineSubtotalOf(line: { unitPrice: number; quantity: number }): number {
    return lineSubtotal(line.unitPrice, line.quantity);
  }

  protected stateLabel(state: SaleState): string {
    switch (state) {
      case 'NEW':
        return 'Nueva';
      case 'CONFIRMED':
        return 'Confirmada';
      case 'CANCELLED':
        return 'Cancelada';
    }
  }

  protected employeeName(id: string): string {
    const user = this.employees().find((u) => u.id === id);
    return user ? `${user.name} ${user.lastName}` : '—';
  }

  protected paymentMethodName(id: string): string {
    return this.paymentMethods().find((pm) => pm.id === id)?.name ?? '—';
  }

  protected taxRate(id: string): number {
    return this.taxes().find((t) => t.id === id)?.rate ?? 0;
  }

  protected lineDescriptor(line: { itemId: string | null; freeConceptId: string | null }): string {
    if (line.freeConceptId) {
      const fc = this.freeConcepts().find((f) => f.id === line.freeConceptId);
      return fc ? fc.name : 'Concepto libre';
    }
    if (line.itemId) {
      const item = this.allItems().find((i) => i.id === line.itemId);
      if (!item) return 'Item';
      const article = this.articles().find((a) => a.id === item.articleId);
      return article ? article.name : 'Item';
    }
    return '—';
  }

  protected removeSale(): void {
    const id = this.viewingId();
    if (!id) return;
    if (!confirm('¿Eliminar esta venta? Los items volverán a estar disponibles.')) return;
    this.saleClient.delete(id).subscribe({
      next: () => this.router.navigate(['/sales']),
      error: () => this.error.set('No se pudo eliminar la venta.'),
    });
  }

  protected cancel(): void {
    this.router.navigate(['/sales']);
  }

  protected save(): void {
    if (!this.canSave() || this.saving()) return;
    this.saving.set(true);
    this.error.set(null);

    const header = this.headerForm.getRawValue();
    const body: SaleRequest = {
      employeeId: header.employeeId,
      paymentMethodId: header.paymentMethodId,
      clientId: null,
      lines: this.lines().map<SaleLineRequest>((line) => ({
        itemId: line.itemId,
        freeConceptId: line.freeConceptId,
        quantity: line.itemId ? null : line.quantity,
        unitPrice: line.unitPrice,
        taxId: line.taxId,
      })),
    };

    this.saleClient.create(body).subscribe({
      next: (created) => {
        this.saving.set(false);
        this.router.navigate(['/sales', created.id]);
      },
      error: () => {
        this.saving.set(false);
        this.error.set('No se pudo guardar la venta.');
      },
    });
  }
}
