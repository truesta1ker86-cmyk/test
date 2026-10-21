import { MenuGroup } from '../interfaces/nav.models';

export const MENU_CONFIG: MenuGroup[] = [
  {
    title: 'Рабочее пространство',
    items: [
      { tab: 'overview', label: 'Обзор', tooltip: 'Рабочая панель', icon: 'i-grid' },
      { tab: 'orders', label: 'Заказы', tooltip: 'Заказы', icon: 'i-box' },
      { tab: 'returns', label: 'Возвраты', tooltip: 'Возвраты', icon: 'i-return' },
      {
        tab: 'mapping',
        label: 'Сопоставление с 1С',
        tooltip: 'Сопоставление с 1С',
        icon: 'i-refresh',
      },
      {
        tab: 'stocks',
        label: 'Остатки и склады',
        tooltip: 'Остатки и склады',
        icon: 'i-warehouse',
        children: [
          {
            workspace: 'inventory',
            label: 'Общий остаток',
            path: '/stocks',
            queryParams: { tab: 'reconciliation' },
          },
          {
            workspace: 'allocation',
            label: 'Распределение по складам',
            path: '/stocks',
            queryParams: { tab: 'matrix' },
          },
        ],
      },
    ],
  },
  {
    title: 'Ценообразование',
    items: [
      { tab: 'pricing', label: 'Расчёт цен', tooltip: 'Расчёт цен', icon: 'i-tag', exact: true },
      {
        tab: 'formula',
        path: '/pricing/formula',
        label: 'Формула и параметры',
        tooltip: 'Формула',
        icon: 'i-panel-toggle',
      },
      { tab: 'promotions', label: 'Акции', tooltip: 'Акции', icon: 'i-tag' },
    ],
  },
  {
    title: 'Отчёты и данные',
    items: [
      { tab: 'finance', label: 'Финансы', tooltip: 'Финансы', icon: 'i-chart' },
      { tab: 'imports', label: 'Импорт Excel и CSV', tooltip: 'Импорт таблиц', icon: 'i-upload' },
      {
        tab: 'account',
        label: 'Настройки и доступ',
        tooltip: 'Настройки и доступ',
        icon: 'i-panel-toggle',
      },
      { tab: 'migration', label: 'Этапы переноса', tooltip: 'Этапы переноса', icon: 'i-warehouse' },
    ],
  },
];
