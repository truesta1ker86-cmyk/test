import { Component, signal, computed } from '@angular/core';

@Component({
  selector: 'app-overview-actions',
  standalone: false,
  templateUrl: './overview-actions.component.html',
  styleUrls: ['./overview-actions.component.scss']
})
export class OverviewActionsComponent {
  isPreflightLoading = signal<boolean>(false);
  isSyncLoading = signal<boolean>(false);

  isProcessing = computed(() => this.isPreflightLoading() || this.isSyncLoading());

  runPreflight(): void {
    if (this.isProcessing()) return;

    this.isPreflightLoading.set(true);
    console.log('Инициирована проверка готовности систем (1С и Маркетплейс)...');

    setTimeout(() => {
      this.isPreflightLoading.set(false);
      console.log('Проверка готовности успешно завершена: ошибок не обнаружено.');
    }, 2000);
  }

  runSync(): void {
    if (this.isProcessing()) return;

    this.isSyncLoading.set(true);
    console.log('Запущен принудительный обмен данными...');

    setTimeout(() => {
      this.isSyncLoading.set(false);
      console.log('Синхронизация с 1С успешно выполнена.');
    }, 3500);
  }
}
