export function pageTitle(url: string): string {
  const path = url.split('?')[0].split('/')[1];
  if (path === 'account') {
    const tab = new URLSearchParams(url.split('?')[1] || '').get('tab');
    return tab === 'billing'
      ? 'Баланс и пополнение'
      : tab === 'team'
        ? 'Команда'
        : 'Личный кабинет';
  }
  return (
    (
      {
        overview: 'Обзор',
        orders: 'Заказы',
        returns: 'Возвраты',
        products: 'Карточки товаров',
        mapping: 'Связь товаров с 1С',
        stocks: 'Остатки',
        pricing: 'Расчёт цен',
        finance: 'Финансовый результат',
        promotions: 'Акции',
        account: 'Настройки и доступ',
        imports: 'Загрузка Excel',
      } as Record<string, string>
    )[path] || 'Ozon × 1С'
  );
}
