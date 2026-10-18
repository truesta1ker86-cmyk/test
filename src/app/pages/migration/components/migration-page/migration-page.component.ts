import { MIGRATION_PAGE_SECTIONS } from './infrastructure/constants/migration-page.constants';
import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush,

  selector: 'app-migration-page',

  template: `<div class="page-heading">
      <div>
        <h1>Состав версии 2</h1>
        <p>Angular-интерфейс и отдельный C++ API. Рабочая версия продолжает работать.</p>
      </div>
    </div>
    <section class="panel migration-panel" aria-labelledby="migration-title">
      <div class="panel-heading">
        <h2 id="migration-title">Рабочие разделы отдельной копии</h2>
        <span class="version-badge">Изолированная v2</span>
      </div>
      @for (section of sections; track section.path) {
        <div class="migration-row">
          <div>
            <h3>{{ section.title }}</h3>
            <p>{{ section.description }}</p>
          </div>
          <a class="button" [routerLink]="section.path">Открыть</a>
        </div>
      }
      <div class="migration-footer">
        <span
          >Публикация, изменение отправлений и автоматика Ozon выключены. Чтение справочников и 1С
          запускается вручную.</span
        ><a class="button" href="/app">Основная версия</a>
      </div>
    </section>`,
})
export class MigrationPage {
  readonly sections = MIGRATION_PAGE_SECTIONS;
}
