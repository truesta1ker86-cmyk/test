import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { Api, errorMessage } from '../core/api';
import { Formula } from '../core/contracts';
import { date, money, percent } from '../core/format';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { editorValue, displayInput, EditorField } from './editor-fields';

@Component({
  selector: 'app-formula-page',
  imports: [RouterLink, ReactiveFormsModule],
  templateUrl: './formula-page.html',
})
export class FormulaPage {
  readonly formula = signal<Formula | null>(null);
  readonly busy = signal(true);
  readonly error = signal('');
  readonly message = signal('');
  readonly canManage = signal(false);
  readonly saving = signal(false);
  readonly defaults = signal<{ min_price: string; price: string; old_price: string } | null>(null);
  readonly parameterFields: EditorField[] = [
    { key: 'price_divisor', label: 'Делитель цены', kind: 'number', nullable: false },
    { key: 'old_price_divisor', label: 'Делитель старой цены', kind: 'number', nullable: false },
    { key: 'handling_fee', label: 'Обработка, ₽', kind: 'number', nullable: false },
    { key: 'last_mile_fee', label: 'Последняя миля, ₽', kind: 'number', nullable: false },
    { key: 'acquiring_percent', label: 'Эквайринг, %', kind: 'rate', nullable: false },
    { key: 'other_fees_percent', label: 'Прочие начисления, %', kind: 'rate', nullable: false },
    { key: 'rfbs_delivery_percent', label: 'Доставка РФБС, %', kind: 'rate', nullable: false },
    { key: 'fbs_expenses_percent', label: 'Расходы FBS, %', kind: 'rate', nullable: false },
    { key: 'rfbs_expenses_percent', label: 'Расходы РФБС, %', kind: 'rate', nullable: false },
  ];
  readonly editForm = new FormGroup(
    Object.fromEntries(
      [
        ...this.parameterFields.map((field) => field.key),
        'min_price_expression',
        'price_expression',
        'old_price_expression',
      ].map((key) => [key, new FormControl('', { nonNullable: true })]),
    ),
  );
  readonly money = money;
  readonly percent = percent;
  readonly date = date;
  private readonly api = inject(Api);
  private readonly destroy = inject(DestroyRef);
  constructor() {
    this.api
      .refs()
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (r) => this.defaults.set(r.default_expressions || null),
        error: (e) => this.error.set(errorMessage(e)),
      });
    this.api
      .workspace()
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({ next: (value) => this.canManage.set(value.can_manage) });
    this.load();
  }
  load(): void {
    this.busy.set(true);
    this.error.set('');
    this.api
      .formula()
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (data) => {
          this.formula.set(data);
          for (const field of this.parameterFields)
            this.editForm.controls[field.key].setValue(
              displayInput(field, data[field.key as keyof Formula]),
            );
          this.editForm.controls['min_price_expression'].setValue(data.expressions.min_price);
          this.editForm.controls['price_expression'].setValue(data.expressions.price);
          this.editForm.controls['old_price_expression'].setValue(data.expressions.old_price);
          this.busy.set(false);
        },
        error: (error) => {
          this.error.set(errorMessage(error));
          this.busy.set(false);
        },
      });
  }
  save(): void {
    if (this.saving() || !this.canManage()) return;
    this.error.set('');
    this.message.set('');
    try {
      const body: Record<string, unknown> = { expected_revision: this.formula()?.revision };
      for (const field of this.parameterFields)
        body[field.key] = editorValue(field, this.editForm.controls[field.key].value);
      for (const key of ['min_price_expression', 'price_expression', 'old_price_expression'])
        body[key] = this.editForm.controls[key].value;
      this.saving.set(true);
      this.editForm.disable({ emitEvent: false });
      this.api
        .saveFormula(body)
        .pipe(takeUntilDestroyed(this.destroy))
        .subscribe({
          next: (data) => {
            this.formula.set(data);
            this.saving.set(false);
            this.editForm.enable({ emitEvent: false });
            this.message.set('Формула сохранена и цены пересчитаны в копии v2.');
          },
          error: (error) => {
            this.saving.set(false);
            this.editForm.enable({ emitEvent: false });
            this.error.set(errorMessage(error));
          },
        });
    } catch (error) {
      this.error.set(errorMessage(error));
    }
  }
  restoreDefaults() {
    const values = this.defaults();
    if (!values) return;
    for (const key of ['min_price', 'price', 'old_price'] as const)
      this.editForm.controls[key + '_expression'].setValue(values[key]);
    this.message.set('Исходные выражения v1 подставлены. Для применения сохраните формулу.');
  }
}
