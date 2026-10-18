import type {
  Candidate,
  CharacteristicCandidate,
} from '../../../products/infrastructure/interfaces/contracts.interfaces';

export interface MappingCandidate extends Candidate {
  base_units: number;
  warehouse_count: number;
}

export interface MappingComparison extends CharacteristicCandidate {
  onec_code: string;
  onec_name: string;
  coverage_percent: number;
}

export interface MappingDraft {
  explicitCode?: string;
  offer_id: string;
  identity: string;
  units: string;
  originalIdentity: string;
  originalUnits: number;
  expected_version: string;
  name: string;
}
