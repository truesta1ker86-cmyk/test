import { number as amount } from '../../../../core/infrastructure/utils/format.utils';
import type { Amount } from '../../../../core/infrastructure/types/contracts.types';
import { labels } from '../constants/format.constants';

Object.assign(labels, {
  acceptance_in_progress: 'Идёт приёмка',
  awaiting_packaging: 'Ожидает упаковки',
  awaiting_delivering: 'Ожидает отгрузки',
  awaiting_deliver: 'Ожидает отгрузки',
  delivering: 'В доставке',
  driver_pickup: 'Передан водителю',
  arbitration: 'Арбитраж',
  client_arbitration: 'Арбитраж с покупателем',
  WaitingShipment: 'Ожидает отправки',
  MovingToMarketplace: 'Возвращается на склад маркетплейса',
  MovingToOzon: 'Возвращается на склад маркетплейса',
  ReturnedToOzon: 'Возвращён на склад маркетплейса',
  MovingToPlace: 'Перемещается к месту выдачи',
  MovingToSeller: 'Возвращается продавцу',
  WaitingForGetting: 'Ожидает получения',
  ReadyForGetting: 'Готов к получению',
  AcceptedFromCustomer: 'Принят от покупателя',
  ArrivedAtReturnPlace: 'Прибыл в пункт возврата',
  ReceivedBySeller: 'Получен продавцом',
  ReturnedToSeller: 'Возвращён продавцу',
  FullRefunded: 'Полный возврат средств',
  PartialRefunded: 'Частичный возврат средств',
  AwaitingCompensation: 'Ожидает компенсации',
  CompensationSent: 'Компенсация отправлена',
  CompensationReceived: 'Компенсация получена',
  Disposing: 'Передан на утилизацию',
  Disposed: 'Утилизирован',
  Utilized: 'Утилизирован',
});

export function status(value: string | null | undefined, scheme?: string | null) {
  if (scheme?.toLowerCase() === 'fbo') {
    const fbo: Record<string, string> = {
      awaiting_packaging: 'Упаковывает маркетплейс',
      awaiting_delivering: 'Маркетплейс готовит отгрузку',
      awaiting_deliver: 'Маркетплейс готовит отгрузку',
      delivering: 'Маркетплейс доставляет',
    };
    if (value && Object.hasOwn(fbo, value)) return fbo[value];
  }
  return value ? (Object.hasOwn(labels, value) ? labels[value] : value) : '—';
}

export function currency(value: Amount | undefined, code: string | null = 'RUB') {
  const n = amount(value);
  if (n === null) return '—';
  try {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: code || 'RUB',
      maximumFractionDigits: 2,
    }).format(n);
  } catch {
    return (
      new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 }).format(n) + ' ' + (code || '')
    );
  }
}

export function quantity(value: Amount | undefined) {
  const n = amount(value);
  return n === null ? '—' : new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 3 }).format(n);
}

export function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob),
    a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}
