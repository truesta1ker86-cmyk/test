import { MenuGroup } from "../interfaces/nav.models";

export const MENU_CONFIG: MenuGroup[] = [
  {
    title: 'Разделы',
    items: [
      { label: 'Обзор', tab: 'overview', tooltip: 'Обзор', icon: 'i-grid' },
      { label: 'Заказы', tab: 'orders', tooltip: 'Заказы', icon: 'i-box', count: 346 },
      {
        label: 'Остатки',
        tab: 'stocks',
        tooltip: 'Остатки',
        icon: 'i-warehouse',
        count: 51,
        children: [
          { label: 'Общий остаток', workspace: 'inventory', count: 51 },
          { label: 'Разделить остаток между складами', workspace: 'allocation', count: 2 }
        ]
      },
      { label: 'Возвраты', tab: 'returns', tooltip: 'Возвраты', icon: 'i-return', count: 37 }
    ]
  },
  {
    title: 'Аналитика',
    marginTop: 8,
    items: [
      { label: 'Финансовый результат', tab: 'profit', tooltip: 'Финансовый результат', icon: 'i-chart' },
      { label: 'Карточки товаров', tab: 'products', tooltip: 'Карточки товаров', icon: 'i-box' }
    ]
  },
  {
    title: 'Расчёты',
    marginTop: 8,
    items: [
      { label: 'Расчёт цен', tab: 'pricing', tooltip: 'Расчёт цен', icon: 'i-tag' }
    ]
  },
  {
    title: 'Excel и 1С',
    marginTop: 8,
    items: [
      { label: 'Загрузка Excel', tab: 'imports', tooltip: 'Загрузка Excel', icon: 'i-upload' },
      { label: 'Связь товаров с 1С', tab: 'mapping', tooltip: 'Связь товаров с 1С', icon: 'i-refresh' },
      { label: 'Отправка в маркетплейс', tab: 'push', tooltip: 'Отправка в маркетплейс', icon: 'i-upload' }
    ]
  },
  {
    title: 'Аккаунт',
    marginTop: 8,
    items: [
      { label: 'Баланс и пополнение', tab: 'billing', tooltip: 'Баланс и пополнение', icon: 'i-wallet', count: 0 },
      { label: 'Команда', tab: 'team', tooltip: 'Команда и доступы', icon: 'i-users' }
    ]
  }
];
