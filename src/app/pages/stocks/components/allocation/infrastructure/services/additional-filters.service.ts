import { Injectable, computed, signal } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';


export interface AdditionalFilterValues {
  searchOffer: string;
  searchName: string;
}

const EMPTY: AdditionalFilterValues = {
  searchOffer: '',
  searchName: '',
};

@Injectable()
export class AdditionalFiltersService {
  private readonly _values = signal<AdditionalFilterValues>({ ...EMPTY });

  readonly values = this._values.asReadonly();

  readonly changes$ = toObservable(this._values);


  updateFilter<K extends keyof AdditionalFilterValues>(
    field: K,
    value: AdditionalFilterValues[K],
  ): void {
    this._values.update(prev => ({ ...prev, [field]: value }));
  }

  patch(patch: Partial<AdditionalFilterValues>): void {
    this._values.update(prev => ({ ...prev, ...patch }));
  }

  resetField<K extends keyof AdditionalFilterValues>(field: K): void {
    this._values.update(prev => ({ ...prev, [field]: EMPTY[field] }));
  }
}