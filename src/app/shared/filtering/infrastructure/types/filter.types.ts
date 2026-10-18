import { MatchContext, FieldRule } from '../interfaces/filter.interfaces';

export type Scalar = string | number | boolean | null | undefined;

export type Entity = Record<string, Scalar>;

export type MatchPredicate<TEntity extends Entity> = (ctx: MatchContext<TEntity>) => boolean;

export type FilterValueTransformer = (value: string) => string;

export type FilterSchema<TEntity extends Entity> = {
  [K in keyof TEntity]?: FieldRule<TEntity>;
};

export type FilterValues<TEntity extends Entity> = Partial<{
  [K in keyof TEntity]: string;
}> &
  Record<string, string | undefined>;

export type OperatorRegistry = Map<string, (entityValue: string, filterValue: string) => boolean>;
