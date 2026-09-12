import type {
  Entity,
  FieldRule,
  FilterHooks,
  FilterSchema,
  FilterValues,
  MatchContext,
  Scalar,
} from './filter.types';
import { getOperator } from './operators';

/** Нормализация значения. */
function normalize(value: Scalar, caseSensitive: boolean): string {
  const str = value == null ? '' : String(value);
  return caseSensitive ? str : str.toLowerCase();
}

/** Проверка одного поля с учётом правил и хуков. */
export function matchField<TEntity extends Entity>(
  entity: TEntity,
  rule: FieldRule<TEntity>,
  rawFilterValue: string,
  filterKey: string,
  hooks?: FilterHooks<TEntity>,
): boolean {
  const caseSensitive = rule.caseSensitive ?? false;

  // Применяем фильтр-трансформер, если задан
  const preparedFilterValue = rule.filterTransform
    ? rule.filterTransform(rawFilterValue)
    : rawFilterValue;

  const filterValue = normalize(preparedFilterValue.trim(), caseSensitive);

  // Пустой фильтр — пропускаем без проверки
  if (!filterValue) return true;

  // Собираем значения полей
  const paths = [rule.path, ...(rule.extraPaths ?? [])];
  const values: Scalar[] = paths.map((path) => {
    const raw = entity[path];
    return rule.transform ? rule.transform(raw) : raw;
  });

  const primaryValue = values[0];

  // Формируем контекст для кастомных обработчиков
  const context: MatchContext<TEntity> = {
    entity,
    filterValue: preparedFilterValue.trim(),
    entityValue: primaryValue,
    filterKey,
    rule,
  };

  // Хук beforeFieldMatch — можно подменить результат
  if (hooks?.beforeFieldMatch) {
    const hookResult = hooks.beforeFieldMatch(context);
    if (typeof hookResult === 'boolean') return hookResult;
  }

  // Приоритет 1: свой predicate для поля
  let passed: boolean;
  if (rule.predicate) {
    passed = rule.predicate(context);
  } else {
    // Приоритет 2: кастомный оператор из реестра или встроенный
    const operatorName = rule.customMode ?? rule.mode ?? 'equals';
    const operator = getOperator(operatorName);

    if (!operator) {
      // Оператор не найден — считаем правило не прошедшим
      console.warn(`[filter-engine] Unknown operator: "${operatorName}"`);
      passed = false;
    } else {
      // Составное сравнение (anyField)
      if (rule.extraPaths?.length) {
        passed = values.some((v) => operator(normalize(v, caseSensitive), filterValue));
      } else {
        passed = operator(normalize(primaryValue, caseSensitive), filterValue);
      }
    }
  }

  // Хук afterFieldMatch — можно переопределить результат
  if (hooks?.afterFieldMatch) {
    passed = hooks.afterFieldMatch(context, passed);
  }

  return passed;
}

/** Создаёт предикат для одной сущности. */
export function createMatcher<TEntity extends Entity>(
  schema: FilterSchema<TEntity>,
  values: FilterValues<TEntity>,
  hooks?: FilterHooks<TEntity>,
): (entity: TEntity) => boolean {
  const activeRules: Array<[keyof TEntity, FieldRule<TEntity>, string]> = [];

  for (const key of Object.keys(schema) as (keyof TEntity)[]) {
    const rule = schema[key];
    if (!rule) continue;
    const raw = values[key as string];
    if (raw == null || raw === '') continue;
    activeRules.push([key, rule, String(raw)]);
  }

  if (!activeRules.length) return () => true;

  return (entity: TEntity) => {
    const contexts: MatchContext<TEntity>[] = [];

    for (const [key, rule, raw] of activeRules) {
      const passed = matchField(entity, rule, raw, String(key), hooks);
      if (!passed) {
        hooks?.onEntityChecked?.(entity, false, contexts);
        return false;
      }
    }

    hooks?.onEntityChecked?.(entity, true, contexts);
    return true;
  };
}

/** Применяет фильтр ко всему массиву. */
export function applyFilter<TEntity extends Entity>(
  items: readonly TEntity[],
  schema: FilterSchema<TEntity>,
  values: FilterValues<TEntity>,
  hooks?: FilterHooks<TEntity>,
): TEntity[] {
  hooks?.beforeFilter?.(items, values);

  const predicate = createMatcher(schema, values, hooks);
  const result = items.filter(predicate);

  return hooks?.afterFilter?.(result, values) ?? result;
}
