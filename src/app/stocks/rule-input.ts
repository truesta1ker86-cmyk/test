import type { Rule } from './contracts';
import { percentageToShare, shareToPercentage } from './matrix-state';

export function normalizedRule(rule: Rule): Rule {
  const offer_id = rule.offer_id.trim();
  if (!offer_id) throw new Error('Укажите артикул товара.');
  if (!Number.isSafeInteger(rule.quantum) || rule.quantum < 1)
    throw new Error('Кратность должна быть целым числом от 1.');
  if (rule.maintain_target) {
    if (rule.target_qty === null || !Number.isSafeInteger(rule.target_qty) || rule.target_qty < 0)
      throw new Error('Укажите целое фиксированное количество от 0.');
    return { ...rule, offer_id, share: null };
  }
  if (rule.share === null || String(rule.share).trim() === '')
    throw new Error('Укажите долю от наличия 1С.');
  return {
    ...rule,
    offer_id,
    target_qty: null,
    share: percentageToShare(shareToPercentage(rule.share)),
  };
}
