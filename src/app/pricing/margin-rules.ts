import { Component, computed, DestroyRef, inject, input, output, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { Api, errorMessage } from '../core/api';
import { BulkEditor } from './bulk-editor';
import { Icon } from '../shared/icon';
import { editorValue } from './editor-fields';
@Component({
  selector: 'app-margin-rules',
  imports: [ReactiveFormsModule, BulkEditor, Icon],
  templateUrl: './margin-rules.html',
  styleUrls: ['./pricing-workflow.css', './margin-rules.css'],
})
export class MarginRules {
  readonly finTypes = input<string[]>([]);
  readonly finGroups = input<{ report_type: string; label: string }[]>([]);
  readonly changed = output<void>();
  readonly hasDrafts = input(false);
  readonly categories = input<
    {
      description_category_id: number;
      type_id: number;
      category_label: string;
      type_label: string;
    }[]
  >([]);
  readonly busy = signal(false);
  readonly error = signal('');
  readonly message = signal('');
  readonly form = new FormGroup({
    kind: new FormControl('category', { nonNullable: true }),
    fin_type: new FormControl('', { nonNullable: true }),
    category: new FormControl('', { nonNullable: true }),
    type: new FormControl('0', { nonNullable: true }),
    recalc_fin: new FormControl('', { nonNullable: true }),
    margin: new FormControl('20', { nonNullable: true }),
  });
  readonly categoryOptions = computed(() => [
    ...new Map(this.categories().map((c) => [c.description_category_id, c])).values(),
  ]);
  categoryTypes() {
    return this.categories().filter(
      (c) => String(c.description_category_id) === this.form.controls.category.value,
    );
  }
  readonly selectedFin = toSignal(this.form.controls.fin_type.valueChanges, { initialValue: '' });
  readonly finScope = computed(() => ({ filters: { report_type: this.selectedFin() } }));
  categoryChanged() {
    this.form.controls.type.setValue('0');
  }
  recalculate() {
    if (this.busy()) return;
    this.busy.set(true);
    this.error.set('');
    this.message.set('');
    const fin = this.form.controls.recalc_fin.value;
    this.api
      .recalculate(fin ? { filters: { fin_type: fin } } : {})
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (result) => {
          this.busy.set(false);
          this.message.set(
            `Рассчитано: ${result.recalculated}. Требуют данных: ${result.failed || 0}. Пропущено: ${result.skipped || 0}.`,
          );
          this.changed.emit();
        },
        error: (error) => {
          this.busy.set(false);
          this.error.set(errorMessage(error));
        },
      });
  }
  private readonly api = inject(Api);
  private readonly destroy = inject(DestroyRef);
  save(): void {
    if (this.busy()) return;
    this.error.set('');
    this.message.set('');
    try {
      const margin = editorValue(
        { key: 'margin', label: 'Маржа', kind: 'rate', nullable: false },
        this.form.controls.margin.value,
      );
      const cid = Number(this.form.controls.category.value),
        tid = Number(this.form.controls.type.value);
      if (!this.categoryOptions().some((c) => c.description_category_id === cid))
        throw new Error('Выберите категорию.');
      if (tid !== 0 && !this.categoryTypes().some((c) => c.type_id === tid))
        throw new Error('Выберите тип товара.');
      const body = { description_category_id: cid, type_id: tid, margin };
      const filters = { description_category_id: cid, ...(tid ? { type_id: tid } : {}) };
      this.busy.set(true);
      this.api
        .saveMargin(body, true)
        .pipe(takeUntilDestroyed(this.destroy))
        .subscribe({
          next: () =>
            this.api
              .recalculate({ filters })
              .pipe(takeUntilDestroyed(this.destroy))
              .subscribe({
                next: (result) => {
                  this.busy.set(false);
                  this.message.set(result.message || 'Правило сохранено.');
                  this.changed.emit();
                },
                error: (error) => {
                  this.busy.set(false);
                  this.error.set('Правило сохранено; пересчёт не завершён. ' + errorMessage(error));
                  this.changed.emit();
                },
              }),
          error: (error) => {
            this.busy.set(false);
            this.error.set(errorMessage(error));
          },
        });
    } catch (error) {
      this.error.set(errorMessage(error));
    }
  }
}
