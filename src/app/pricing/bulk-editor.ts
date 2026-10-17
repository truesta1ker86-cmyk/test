import {
  AfterViewInit,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  input,
  output,
  signal,
  effect,
  computed,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Api, errorMessage } from '../core/api';
import { BulkPreview, Scope } from './editor-contracts';
import { editorFields, editorValue } from './editor-fields';
import { Icon } from '../shared/icons-sprite/icons-sprite/icons-sprite.component';
import { date } from '../core/format';
@Component({
  selector: 'app-bulk-editor',
  imports: [ReactiveFormsModule, Icon],
  templateUrl: './bulk-editor.html',
  styleUrl: './pricing-workflow.css',
})
export class BulkEditor implements AfterViewInit {
  readonly inline = input(false);
  readonly scope = input.required<Scope>();
  readonly label = input.required<string>();
  readonly closed = output<void>();
  readonly applied = output<void>();
  readonly marginOnly = input(false);
  readonly fields = computed(() =>
    this.marginOnly() ? editorFields.filter((f) => f.key === 'fixed_margin') : editorFields,
  );
  readonly date = date;
  readonly preview = signal<BulkPreview | null>(null);
  readonly busy = signal(false);
  readonly error = signal('');
  readonly result = signal('');
  readonly uncertain = signal(false);
  readonly form = new FormGroup({
    field: new FormControl('fixed_margin', { nonNullable: true }),
    value: new FormControl('', { nonNullable: true }),
    clear: new FormControl(false, { nonNullable: true }),
    include_locked: new FormControl(false, { nonNullable: true }),
  });
  private readonly api = inject(Api);
  private readonly destroy = inject(DestroyRef);
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');
  private inspectedScope = '';
  private readonly invalidateScope = effect(() => {
    this.scope();
    this.preview.set(null);
  });
  ngAfterViewInit(): void {
    if (this.marginOnly()) this.form.controls.value.setValue('20', { emitEvent: false });
    if (this.inline()) this.dialog().nativeElement.open = true;
    else this.dialog().nativeElement.showModal();
    this.form.valueChanges
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe(() => this.preview.set(null));
    this.form.controls.field.valueChanges.pipe(takeUntilDestroyed(this.destroy)).subscribe(() => {
      this.form.controls.value.setValue('');
      this.form.controls.clear.setValue(false);
    });
  }
  field() {
    return this.fields().find((field) => field.key === this.form.controls.field.value)!;
  }
  close(event?: Event) {
    event?.preventDefault();
    if (!this.busy()) {
      this.dialog().nativeElement.close();
      this.closed.emit();
    }
  }
  inspect(): void {
    if (this.busy()) return;
    this.error.set('');
    this.result.set('');
    try {
      if (this.scope().offer_ids?.length === 0) throw new Error('Сначала выберите товары.');
      const field = this.field();
      const value =
        this.form.controls.clear.value && field.nullable
          ? null
          : editorValue(field, this.form.controls.value.value);
      this.busy.set(true);
      const scopeSignature = JSON.stringify(this.scope());
      this.inspectedScope = scopeSignature;
      this.form.disable({ emitEvent: false });
      this.api
        .bulkPreview(
          this.scope(),
          { [field.key]: value },
          !this.marginOnly() && this.form.controls.include_locked.value,
        )
        .pipe(takeUntilDestroyed(this.destroy))
        .subscribe({
          next: (preview) => {
            if (JSON.stringify(this.scope()) === scopeSignature) this.preview.set(preview);
            else this.error.set('Отбор изменился. Проверьте изменения заново.');
            this.busy.set(false);
            this.form.enable({ emitEvent: false });
            this.uncertain.set(false);
          },
          error: (error) => {
            this.error.set(errorMessage(error));
            this.busy.set(false);
            this.form.enable({ emitEvent: false });
          },
        });
    } catch (error) {
      this.error.set(errorMessage(error));
    }
  }
  expired(): boolean {
    const raw = this.preview()?.expires_at;
    if (!raw) return false;
    const expires = new Date(
      raw.endsWith('Z') || /[+-]\d\d:\d\d$/.test(raw) ? raw : raw + 'Z',
    ).getTime();
    return !Number.isFinite(expires) || expires < Date.now();
  }
  apply(): void {
    if (!this.preview() || this.busy() || this.uncertain() || this.expired()) return;
    if (JSON.stringify(this.scope()) !== this.inspectedScope) {
      this.preview.set(null);
      return;
    }
    this.busy.set(true);
    this.form.disable({ emitEvent: false });
    this.error.set('');
    this.api
      .bulkApply(this.preview()!.operation_id)
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (result) => {
          this.busy.set(false);
          this.form.enable({ emitEvent: false });
          this.result.set(
            `Изменено: ${result.applied || 0}. Пересчитано: ${result.recalculated || 0}. Требуют данных: ${result.recalculation_failed || 0}.`,
          );
          this.preview.set(null);
          this.applied.emit();
        },
        error: (error) => {
          this.busy.set(false);
          this.error.set(errorMessage(error));
          this.uncertain.set(true);
        },
      });
  }
  checkResult(): void {
    const id = this.preview()?.operation_id;
    if (!id) return;
    this.busy.set(true);
    this.api
      .operation(id)
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (operation) => {
          this.busy.set(false);
          if (operation?.status === 'applied') {
            this.result.set(`Сохранено: ${operation.applied}.`);
            this.preview.set(null);
            this.uncertain.set(false);
            this.form.enable({ emitEvent: false });
            this.applied.emit();
          } else {
            this.error.set('Операция ещё не подтверждена. Проверьте историю перед повтором.');
          }
        },
        error: (error) => {
          this.busy.set(false);
          this.error.set(errorMessage(error));
        },
      });
  }
  valueText(value: unknown): string {
    if (value === null || value === undefined) return 'Автоматически';
    if (this.field().kind === 'rate') return String(Number(value) * 100) + ' %';
    if (this.field().kind === 'boolean') return value ? 'Включена' : 'Выключена';
    return String(value);
  }
}
