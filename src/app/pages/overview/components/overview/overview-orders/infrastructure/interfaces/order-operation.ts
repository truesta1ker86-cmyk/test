
export interface OrderOperation {
  id: string;
  status: 'Доставлен' | 'Отменён' | 'В пути';
  sku: string;
  amount: number | null;
}
