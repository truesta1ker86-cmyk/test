import { Component, computed, inject } from '@angular/core';
import { ProgressService } from '../../../../shared/sse/service/progress.service';

@Component({
  selector: 'app-products',
  standalone: false,
  templateUrl: './products.component.html',
  styleUrls: ['./products.component.scss']
})
export class ProductsComponent {
  pageTitle = 'Карточки товаров';
  pageSubtitle = 'Товары маркетплейса: характеристики, доставленные продажи и подготовка карточек';

  progress = inject(ProgressService);

  /** Страница готовa? */
  readonly pageState = computed(() => this.progress.pageState());

  /** Можно ли редактировать */
  readonly canEdit = computed(() => this.progress.canEdit());

  /** Что показывать пользователю */
  readonly lockReason = computed(() => {
    if (this.progress.isOnecRunning()) return '1С каталог синхронизируется…';
    if (this.progress.isOzonRunning()) return 'Ozon синхронизируется…';
    return '';
  });

  ngOnInit(): void {
    this.progress.checkInitialStatus();
  }
}