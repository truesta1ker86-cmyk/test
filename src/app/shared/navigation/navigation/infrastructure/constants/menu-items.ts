import { MenuGroup } from '../interfaces/nav.models';

export const MENU_CONFIG: MenuGroup[] = [
  {
    title: 'Разделы',
    items: [
      { tab: 'overview', label: 'Обзор', tooltip: 'Рабочая панель', icon: 'i-grid' },
      { tab: 'orders', label: 'Заказы', tooltip: 'Заказы', icon: 'i-box' },
      {
        tab: 'stocks',
        label: 'Остатки',
        tooltip: 'Остатки',
        icon: 'i-warehouse',
        children: [
          {
            workspace: 'inventory',
            default: true,
            label: 'Общий остаток',
            path: '/stocks',
            queryParams: { tab: 'reconciliation' },
          },
          {
            workspace: 'allocation',
            label: 'Разделить остаток между складами',
            path: '/stocks',
            queryParams: { tab: 'matrix' },
          },
        ],
      },
      { tab: 'returns', label: 'Возвраты', tooltip: 'Возвраты', icon: 'i-return' },
    ],
  },
  {
    title: 'Аналитика',
    items: [
      {
        tab: 'finance',
        label: 'Финансовый результат',
        tooltip: 'Финансовый результат',
        icon: 'i-chart',
      },
      { tab: 'products', label: 'Карточки товаров', tooltip: 'Карточки товаров', icon: 'i-box' },
    ],
  },
  {
    title: 'Расчёты',
    items: [
      {
        tab: 'pricing',
        label: 'Расчёт цен',
        tooltip: 'Расчёт цен',
        icon: 'i-tag',
        children: [
          {
            workspace: 'calculation',
            default: true,
            label: 'Расчёт цен',
            path: '/pricing',
            queryParams: { workspace: 'calculation' },
          },
          { workspace: 'formula', label: 'Редактор формулы', path: '/pricing/formula' },
          {
            workspace: 'automation',
            label: 'Автоматическая отправка',
            path: '/pricing',
            queryParams: { workspace: 'automation' },
          },
        ],
      },
    ],
  },
  {
    title: 'Excel и 1С',
    items: [
      { tab: 'imports', label: 'Загрузка Excel', tooltip: 'Загрузка Excel', icon: 'i-upload' },
      {
        tab: 'mapping',
        label: 'Связь товаров с 1С',
        tooltip: 'Связь товаров с 1С',
        icon: 'i-refresh',
      },
    ],
  },
  {
    title: 'Аккаунт',
    items: [
      {
        tab: 'billing',
        path: '/account',
        queryParams: { tab: 'billing' },
        label: 'Баланс и пополнение',
        tooltip: 'Баланс и пополнение',
        icon: 'i-wallet',
      },
      {
        tab: 'team',
        path: '/account',
        queryParams: { tab: 'team' },
        ownerOnly: true,
        label: 'Команда',
        tooltip: 'Команда и доступы',
        icon: 'i-users',
      },
    ],
  },
];
