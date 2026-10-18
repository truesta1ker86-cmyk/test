import { PromotionModel } from '../types/contracts.types';
import { modelNames } from '../constants/contracts.constants';

export const modelLabel = (value: PromotionModel | undefined, category = false) =>
  value == null ? (category ? 'Не назначена' : 'По правилу категории') : modelNames[value];

export const modelHelp = (value: PromotionModel) =>
  value === 0
    ? 'Запрет участия по модели. Сохранение правила не удаляет товар из действующих акций.'
    : value === 1
      ? 'Обычные акции — рекомендованная цена Ozon, в том числе ниже минималки. В бустинге — цена максимального бустинга; при отсутствии заказов за 7 суток — минималка.'
      : value === 2
        ? 'В каждой подходящей акции — минималка. Отсутствие заказов не меняет правило.'
        : 'Индивидуального правила нет; действует правило категории, если оно назначено.';
