export type Scalar = string | number | boolean | null | undefined;
export type Entity = Record<string, Scalar>;

/** Контекст сравнения, передаётся в кастомные обработчики. */
export interface MatchContext<TEntity extends Entity> {
  /** Сущность, которую проверяем. */
  entity: TEntity;
  /** Значение фильтра (сырое, как ввёл пользователь). */
  filterValue: string;
  /** Значение поля сущности после transform. */
  entityValue: Scalar;
  /** Ключ фильтра. */
  filterKey: string;
  /** Правило, по которому идёт сравнение. */
  rule: FieldRule<TEntity>;
}

/** Функция-обработчик одного поля. */
export type MatchPredicate<TEntity extends Entity> =
  (ctx: MatchContext<TEntity>) => boolean;

/** Функция-обработчик значения фильтра до сравнения. */
export type FilterValueTransformer = (value: string) => string;

/** Описание правила для одного поля. */
export interface FieldRule<TEntity extends Entity> {
  /** Поле сущности, с которым сравниваем. */
  path: keyof TEntity;

  /** Имя оператора: 'equals' | 'includes' | … | своё имя из реестра. */
  mode?: string;

  /** Дополнительные поля для составного сравнения. */
  extraPaths?: (keyof TEntity)[];

  /** Преобразование значения сущности до сравнения. */
  transform?: (value: TEntity[keyof TEntity]) => Scalar;

  /** Своё имя оператора — если нужно использовать кастомный из реестра. */
  customMode?: string;

  /** Свой предикат для этого конкретного поля. */
  predicate?: MatchPredicate<TEntity>;

  /** Преобразование значения фильтра до сравнения. */
  filterTransform?: FilterValueTransformer;

  /** Чувствительность к регистру. По умолчанию — false. */
  caseSensitive?: boolean;
}

export type FilterSchema<TEntity extends Entity> = {
  [K in keyof TEntity]?: FieldRule<TEntity>;
};

export type FilterValues<TEntity extends Entity> = Partial<{
  [K in keyof TEntity]: string;
}> & Record<string, string | undefined>;

/** Реестр операторов: имя → функция. */
export type OperatorRegistry = Map<string, (entityValue: string, filterValue: string) => boolean>;

/** Хуки движка. */
export interface FilterHooks<TEntity extends Entity> {
  /** Вызывается до применения фильтра ко всему массиву. */
  beforeFilter?: (items: readonly TEntity[], values: FilterValues<TEntity>) => void;

  /** Вызывается после фильтрации. */
  afterFilter?: (result: TEntity[], values: FilterValues<TEntity>) => TEntity[];

  /** Вызывается для каждой сущности, независимо от результата. */
  onEntityChecked?: (entity: TEntity, passed: boolean, context: MatchContext<TEntity>[]) => void;

  /** Вызывается перед проверкой одного поля. */
  beforeFieldMatch?: (ctx: MatchContext<TEntity>) => boolean | void;

  /** Вызывается после проверки одного поля. */
  afterFieldMatch?: (ctx: MatchContext<TEntity>, passed: boolean) => boolean;
}
