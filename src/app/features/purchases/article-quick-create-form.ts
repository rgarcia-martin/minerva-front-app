import {
  Component,
  EventEmitter,
  Input,
  OnInit,
  Output,
  inject,
  signal,
} from '@angular/core';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';

import { Article, ArticleRequest } from '../catalog/articles/article.model';
import { ArticleClient } from '../catalog/articles/article.client';
import { Tax } from '../catalog/taxes/tax.model';

@Component({
  selector: 'app-article-quick-create-form',
  imports: [ReactiveFormsModule],
  templateUrl: './article-quick-create-form.html',
})
export class ArticleQuickCreateForm implements OnInit {
  private readonly client = inject(ArticleClient);
  private readonly fb = inject(FormBuilder);

  @Input({ required: true }) taxes: Tax[] = [];
  /** Pre-fill the search term as either name or barcode of the new article. */
  @Input() initialQuery = '';

  @Output() readonly articleCreated = new EventEmitter<Article>();
  @Output() readonly cancel = new EventEmitter<void>();

  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(120)]],
    code: ['', [Validators.required, Validators.maxLength(60)]],
    barcode: [''],
    taxId: ['', Validators.required],
    basePrice: [0, [Validators.required, Validators.min(0)]],
    retailPrice: [0, [Validators.required, Validators.min(0)]],
  });

  ngOnInit(): void {
    const query = this.initialQuery.trim();
    const looksLikeBarcode = /^\d{6,}$/.test(query);
    this.form.patchValue({
      name: looksLikeBarcode ? '' : query,
      barcode: looksLikeBarcode ? query : '',
      code: looksLikeBarcode ? query : '',
      taxId: this.taxes[0]?.id ?? '',
    });
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    const body: ArticleRequest = {
      name: raw.name,
      code: raw.code,
      barcode: raw.barcode.trim() === '' ? null : raw.barcode,
      image: null,
      description: null,
      taxId: raw.taxId,
      basePrice: raw.basePrice,
      retailPrice: raw.retailPrice,
      canHaveChildren: false,
      numberOfChildren: null,
      childArticleId: null,
    };

    this.saving.set(true);
    this.error.set(null);
    this.client.create(body).subscribe({
      next: (article) => {
        this.saving.set(false);
        this.articleCreated.emit(article);
      },
      error: () => {
        this.saving.set(false);
        this.error.set('No se pudo crear el artículo.');
      },
    });
  }

  protected onCancel(): void {
    this.cancel.emit();
  }
}
