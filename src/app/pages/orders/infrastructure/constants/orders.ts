export const ORDER_STATUSES = [
  { value: 'awaiting_registration', label: 'Ожидает регистрации' },
  { value: 'acceptance_in_progress', label: 'Идёт приёмка' },
  { value: 'awaiting_approve', label: 'Ожидает подтверждения' },
  { value: 'awaiting_packaging', label: 'Ожидает упаковки' },
  { value: 'awaiting_delivering', label: 'Ожидает отгрузки' },
  { value: 'delivering', label: 'В доставке' },
  { value: 'driver_pickup', label: 'Передан водителю' },
  { value: 'delivered', label: 'Доставлен' },
  { value: 'arbitration', label: 'Арбитраж' },
  { value: 'client_arbitration', label: 'Арбитраж с покупателем' },
  { value: 'not_accepted', label: 'Не принят' },
  { value: 'cancelled', label: 'Отменён' },
];

export const ORDER_SCHEMES = [
  { value: 'fbs', label: 'FBS' },
  { value: 'fbo', label: 'FBO' },
  { value: 'rfbs', label: 'realFBS' },
];
