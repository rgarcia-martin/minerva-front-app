import {
  Component,
  EventEmitter,
  Input,
  OnInit,
  Output,
  inject,
} from '@angular/core';
import {
  FormArray,
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';

import { Tax } from '../taxes/tax.model';
import { Article, ArticleChild, ArticleRequest } from './article.model';

/** Heuristic: six or more consecutive digits indicate a barcode/EAN input. */
const BARCODE_PATTERN = /^\d{6,}$/;

/**
 * Monotonic counter for unique DOM IDs.
 * WHY: prevents label/input collisions when several ArticleForm instances
 * coexist in the same view (e.g. main form + inline child creation form).
 */
let nextFormId = 0;

/**
 * Reusable article form (Template Method pattern).
 *
 * WHY Template Method: the component owns field layout, validation and
 * ArticleRequest assembly — the single piece that would otherwise be duplicated
 * across every consumer. Each parent supplies only the persistence strategy
 * and the visual chrome.
 *
 * Children are modelled as a FormArray of {childArticleId, quantity} rows.
 * Each row is independently validated; no checkbox needed — an empty array
 * simply means the article has no children.
 *
 * @Input compact — hides extended fields (image, description, children section).
 */
@Component({
  selector: 'app-article-form',
  imports: [ReactiveFormsModule],
  templateUrl: './article-form.html',
})
export class ArticleForm implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly idPrefix = `af-${nextFormId++}`;

  /** Show only essential fields when true (name, code, barcode, tax, prices). */
  @Input() compact = false;

  /** Available taxes for the tax dropdown. */
  @Input({ required: true }) taxes: Tax[] = [];

  /**
   * Candidate articles for the child-article dropdown (full mode only).
   * The parent is responsible for filtering out the article being edited.
   */
  @Input() childCandidates: Article[] = [];

  /** Pre-fill form for edit mode. Null means create mode. */
  @Input() article: Article | null = null;

  /** Pre-fill name or barcode from a prior search term (create flows). */
  @Input() initialQuery = '';

  /** Controls the disabled state of action buttons. */
  @Input() saving = false;

  /** Error message displayed above the form fields. */
  @Input() error: string | null = null;

  /** Label for the primary submit button. */
  @Input() submitLabel = 'Guardar';

  /** Emits a validated ArticleRequest when the user submits. */
  @Output() readonly formSubmit = new EventEmitter<ArticleRequest>();

  /** Emits when the user clicks cancel. */
  @Output() readonly formCancel = new EventEmitter<void>();

  /**
   * Emits when the user requests inline child-article creation ("+" button).
   * The parent opens a nested ArticleForm and calls addChild() on completion.
   */
  @Output() readonly createChildRequest = new EventEmitter<void>();

  protected readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(120)]],
    code: ['', [Validators.required, Validators.maxLength(60)]],
    barcode: [''],
    image: [''],
    description: [''],
    taxId: ['', Validators.required],
    basePrice: [0, [Validators.required, Validators.min(0)]],
    retailPrice: [0, [Validators.required, Validators.min(0)]],
    // WHY FormArray: models the 0-N children list; each entry owns its own controls.
    children: this.fb.array<ReturnType<typeof this.buildChildRow>>([]),
  });

  ngOnInit(): void {
    this.applyInputState();
  }

  /** Build a scoped DOM ID for a field to avoid collisions between instances. */
  protected fid(suffix: string): string {
    return `${this.idPrefix}-${suffix}`;
  }

  get childRows(): FormArray {
    return this.form.controls.children as FormArray;
  }

  /** Public: reset the form to reflect a new article (edit) or blank state (create). */
  reset(article: Article | null = null): void {
    this.article = article;
    this.applyInputState();
  }

  /**
   * Public: append a child row with an already-known article ID.
   * Called by the parent after inline child-article creation completes.
   */
  addChild(childArticleId: string): void {
    this.childRows.push(this.buildChildRow(childArticleId, 1));
  }

  protected addEmptyChild(): void {
    this.childRows.push(this.buildChildRow('', 1));
  }

  protected removeChild(index: number): void {
    this.childRows.removeAt(index);
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.formSubmit.emit(this.buildRequest());
  }

  protected cancel(): void {
    this.formCancel.emit();
  }

  // --- Private helpers ---

  private buildChildRow(childArticleId: string, quantity: number) {
    return this.fb.nonNullable.group({
      childArticleId: [childArticleId, Validators.required],
      quantity: [quantity, [Validators.required, Validators.min(1)]],
    });
  }

  private applyInputState(): void {
    // Reset scalar fields first, then rebuild the children FormArray.
    if (this.article) {
      const a = this.article;
      this.form.patchValue({
        name: a.name,
        code: a.code,
        barcode: a.barcode ?? '',
        image: a.image ?? '',
        description: a.description ?? '',
        taxId: a.taxId,
        basePrice: a.basePrice,
        retailPrice: a.retailPrice,
      });
      this.rebuildChildArray(a.children);
    } else {
      const query = this.initialQuery.trim();
      const looksLikeBarcode = BARCODE_PATTERN.test(query);
      this.form.reset({
        name: looksLikeBarcode ? '' : query,
        code: looksLikeBarcode ? query : '',
        barcode: looksLikeBarcode ? query : '',
        image: '',
        description: '',
        taxId: this.taxes[0]?.id ?? '',
        basePrice: 0,
        retailPrice: 0,
      });
      this.rebuildChildArray([]);
    }
  }

  private rebuildChildArray(children: ArticleChild[]): void {
    this.childRows.clear({ emitEvent: false });
    for (const c of children) {
      this.childRows.push(this.buildChildRow(c.childArticleId, c.quantity), { emitEvent: false });
    }
  }

  private buildRequest(): ArticleRequest {
    const raw = this.form.getRawValue();
    const children: ArticleChild[] = this.compact
      ? []
      : raw.children.map((c) => ({
          childArticleId: c.childArticleId,
          quantity: c.quantity,
        }));

    return {
      name: raw.name,
      code: raw.code,
      barcode: raw.barcode.trim() === '' ? null : raw.barcode,
      image: this.compact ? null : (raw.image.trim() === '' ? null : raw.image),
      description: this.compact ? null : (raw.description.trim() === '' ? null : raw.description),
      taxId: raw.taxId,
      basePrice: raw.basePrice,
      retailPrice: raw.retailPrice,
      children,
    };
  }
}
