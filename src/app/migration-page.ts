import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-migration-page',
  imports: [RouterLink],
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
  readonly sections = [
    {
      path: '/products/create',
      title: 'Карточки и AI',
      description:
        'Создание и копирование, категория и характеристики, галерея, AI-предложения и история версий. Изменения сохраняются черновиками.',
    },
    {
      path: '/products',
      title: 'Товары',
      description:
        'Каталог, отборы, упаковки и себестоимость, массовые поля и характеристики, предпросмотр и отмена.',
    },
    {
      path: '/mapping',
      title: 'Сопоставление с 1С',
      description:
        'Поиск номенклатуры и характеристик, подтверждение связи, массовое сопоставление и отмена.',
    },
    {
      path: '/pricing',
      title: 'Расчёт цен',
      description: 'Редактор параметров, пересчёт, рабочие цены, массовые действия и формулы.',
    },
    {
      path: '/orders',
      title: 'Заказы и возвраты',
      description:
        'Текущие и завершённые отправления, состав, поиск, периоды и выгрузка. Команды, меняющие Ozon, выключены.',
    },
    {
      path: '/stocks',
      title: 'Остатки и склады',
      description:
        'Сверка 1С/Ozon, правила складов, матрица распределения, ожидаемые поставки и история локальных изменений.',
    },
    {
      path: '/promotions',
      title: 'Акции',
      description:
        'Снимок участия, индивидуальные и категорийные модели, расчёт предложений и отмена настройки моделей.',
    },
    {
      path: '/finance',
      title: 'Финансы',
      description:
        'Прибыль, валовая по месяцам, недельные продажи, начисления и операции, отчётная себестоимость и Excel.',
    },
    {
      path: '/imports',
      title: 'Импорт таблиц',
      description:
        'Excel/CSV, сопоставление колонок, замечания, предпросмотр изменений, подтверждённое применение и профили.',
    },
    {
      path: '/account',
      title: 'Магазины, команда и подключения',
      description:
        'Собственный вход v2, переключение магазинов, доступы сотрудников, AI-баланс и ключ, чтение 1С в копию.',
    },
  ];
}
