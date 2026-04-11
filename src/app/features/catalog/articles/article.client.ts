import { Injectable } from '@angular/core';

import { ResourceClient } from '../../../core/api/resource-client';
import { Article, ArticleRequest } from './article.model';

@Injectable({ providedIn: 'root' })
export class ArticleClient extends ResourceClient<Article, ArticleRequest> {
  protected readonly path = '/articles';
}
