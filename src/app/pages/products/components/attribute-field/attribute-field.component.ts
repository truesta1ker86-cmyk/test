import { FilterService } from '../../../../shared/directives/filter-panel/infrastructure/services/filter.service';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { FormControl } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import type {
  Attribute,
  AttributeDefinition,
  DictionaryValue,
} from '../../infrastructure/interfaces/contracts.interfaces';
import { CardsApi } from '../../infrastructure/services/cards-api.service';
import { errorMessage } from '../../../../core/infrastructure/utils/api.utils';

@Component({
  providers: [FilterService],
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush,

  selector: 'app-card-attribute',

  templateUrl: './attribute-field.component.html',
  styleUrl: './attribute-field.component.css',
})
export class AttributeField {
  readonly definition = input.required<AttributeDefinition>();
  readonly value = input<Attribute>();
  readonly category = input.required<number>();
  readonly type = input.required<number>();
  readonly readonly = input(false);
  readonly changed = output<Attribute>();
  readonly text = new FormControl('', { nonNullable: true });
  readonly search = new FormControl('', { nonNullable: true });
  readonly values = signal<DictionaryValue[]>([]);
  readonly loading = signal(false);
  readonly open = signal(false);
  readonly error = signal('');
  readonly warning = signal('');
  readonly maxValues = computed(() =>
    this.definition().max_value_count > 0
      ? this.definition().max_value_count
      : this.definition().is_collection
        ? 50
        : 1,
  );
  private readonly api = inject(CardsApi);
  private readonly destroy = inject(DestroyRef);
  private request = 0;
  private lastEmission = '';
  constructor() {
    let previousScope = '';
    effect(() => {
      const scope = [
        this.category(),
        this.type(),
        this.definition().attribute_id,
        this.definition().dictionary_id,
      ].join(':');
      if (previousScope && previousScope !== scope) {
        this.request++;
        this.values.set([]);
        this.open.set(false);
        this.loading.set(false);
        this.error.set('');
        this.search.setValue('', { emitEvent: false });
      }
      previousScope = scope;
    });
    effect(() => {
      const value = this.value();
      if (JSON.stringify(value) === this.lastEmission) return;
      this.text.setValue((value?.values || []).map((v) => v.value || '').join('\n'), {
        emitEvent: false,
      });
    });
    this.text.valueChanges.pipe(takeUntilDestroyed(this.destroy)).subscribe((value) => {
      if (this.readonly()) return;
      this.emit({
        id: this.definition().attribute_id,
        values: value
          .split('\n')
          .filter((v) => v.trim())
          .map((value) => ({ value })),
      });
    });
    this.search.valueChanges
      .pipe(debounceTime(250), distinctUntilChanged(), takeUntilDestroyed(this.destroy))
      .subscribe(() => this.find());
  }
  find() {
    if (this.readonly()) return;
    const request = ++this.request;
    const scope = [
      this.category(),
      this.type(),
      this.definition().attribute_id,
      this.definition().dictionary_id,
    ].join(':');
    this.loading.set(true);
    this.open.set(true);
    this.error.set('');
    this.api
      .dictionary(this.category(), this.type(), this.definition().attribute_id, this.search.value)
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (result) => {
          if (
            request !== this.request ||
            scope !==
              [
                this.category(),
                this.type(),
                this.definition().attribute_id,
                this.definition().dictionary_id,
              ].join(':')
          )
            return;
          this.values.set(result.items);
          this.warning.set(result.warning || '');
          this.loading.set(false);
        },
        error: (error) => {
          if (
            request !== this.request ||
            scope !==
              [
                this.category(),
                this.type(),
                this.definition().attribute_id,
                this.definition().dictionary_id,
              ].join(':')
          )
            return;
          this.error.set(errorMessage(error));
          this.loading.set(false);
        },
      });
  }
  choose(value: DictionaryValue) {
    const current = this.value()?.values || [];
    const values =
      this.maxValues() === 1 ? [] : current.filter((v) => v.dictionary_value_id !== value.id);
    if (values.length >= this.maxValues()) {
      this.error.set(`Можно выбрать не больше ${this.maxValues()} значений.`);
      return;
    }
    this.emit({
      id: this.definition().attribute_id,
      values: [...values, { dictionary_value_id: value.id, value: value.value }],
    });
    this.open.set(false);
    this.search.setValue('', { emitEvent: false });
  }
  remove(index: number) {
    this.emit({
      id: this.definition().attribute_id,
      values: (this.value()?.values || []).filter((_, i) => i !== index),
    });
  }
  private emit(value: Attribute) {
    this.lastEmission = JSON.stringify(value);
    this.changed.emit(value);
  }
}
