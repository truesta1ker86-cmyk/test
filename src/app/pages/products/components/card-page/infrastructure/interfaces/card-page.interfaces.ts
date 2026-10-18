import type {
  Attribute,
  ComplexGroup,
  FullPayload,
} from '../../../../infrastructure/interfaces/contracts.interfaces';

export interface LocalDraft {
  version: string;
  base: FullPayload;
  fields: Record<string, string>;
  attributes: Attribute[];
  complex: ComplexGroup[];
  images: string[];
  categoryConfirmed: boolean;
  discardComplex: boolean;
}
