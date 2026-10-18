export function pageTitle(url: string): string {
  const path = url.split('?')[0].split('/')[1];
  return (
    (
      {
        overview: 'Рабочая панель',
        orders: 'Заказы',
        returns: 'Возвраты',
        products: 'Товары',
        mapping: 'Сопоставление с 1С',
        stocks: 'Остатки и склады',
        pricing: 'Ценообразование',
        finance: 'Финансы',
        promotions: 'Акции',
        account: 'Настройки и доступ',
        imports: 'Импорт таблиц',
      } as Record<string, string>
    )[path] || 'Ozon × 1С'
  );
}
