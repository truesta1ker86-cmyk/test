import {
  AfterViewInit,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Api, errorMessage } from '../core/api';
import { Icon } from '../shared/icon';
import { EditorConfig } from './editor-contracts';
import { SessionContext } from '../core/session-context';
import { EditorDrafts } from './editor-drafts';
import { editorFields, editorValue, displayInput } from './editor-fields';

@Component({
  selector: 'app-price-editor',
  imports: [ReactiveFormsModule, Icon],
  templateUrl: './price-editor.html',
})
export class PriceEditor implements AfterViewInit {
  readonly offer = input.required<string>();
  readonly closed = output<void>();
  readonly saved = output<void>();
  readonly fields = editorFields;
  readonly busy = signal(false);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly message = signal('');
  readonly uncertain = signal(false);
  readonly config = signal<EditorConfig | null>(null);
  readonly form = new FormGroup(
    Object.fromEntries(
      editorFields.map((field) => [field.key, new FormControl('', { nonNullable: true })]),
    ),
  );
  readonly workingForm = new FormGroup({
    field: new FormControl('margin', { nonNullable: true }),
    value: new FormControl('', { nonNullable: true }),
  });
  private readonly api = inject(Api);
  private readonly drafts = inject(EditorDrafts).forShop(
    inject(SessionContext).session()?.tenant_id || 0,
  );
  private readonly destroy = inject(DestroyRef);
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');
  ngAfterViewInit(): void {
    this.dialog().nativeElement.showModal();
    this.load();
  }
  load(): void {
    this.loading.set(true);
    this.error.set('');
    this.api
      .editor(this.offer())
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (data) => {
          this.config.set(data);
          for (const field of this.fields) {
            const control = this.form.controls[field.key];
            if (!control.dirty)
              control.setValue(displayInput(field, data[field.key]), { emitEvent: false });
          }
          const draft = this.drafts.values()[this.offer()];
          if (draft)
            for (const [field, value] of Object.entries(draft)) {
              this.form.controls[field]?.setValue(value, { emitEvent: false });
              this.form.controls[field]?.markAsDirty();
            }
          this.uncertain.set(false);
          this.loading.set(false);
        },
        error: (error) => {
          this.error.set(errorMessage(error));
          this.loading.set(false);
        },
      });
  }
  private remember(): void {
    const draft: Record<string, string> = {};
    for (const field of this.fields)
      if (this.form.controls[field.key].dirty)
        draft[field.key] = this.form.controls[field.key].value;
    if (Object.keys(draft).length) {
      this.drafts.values.update((rows) => ({ ...rows, [this.offer()]: draft }));
      if (!this.drafts.versions.has(this.offer()) && this.config())
        this.drafts.versions.set(this.offer(), this.config()!.version);
    }
  }
  close(event?: Event): void {
    event?.preventDefault();
    if (this.busy()) return;
    this.remember();
    this.dialog().nativeElement.close();
    this.closed.emit();
  }
  private clearRemembered() {
    this.drafts.values.update((rows) => {
      const next = { ...rows };
      delete next[this.offer()];
      return next;
    });
    this.drafts.versions.delete(this.offer());
  }
  discard(): void {
    if (this.busy()) return;
    this.clearRemembered();
    this.form.reset();
    this.form.markAsPristine();
    this.load();
  }
  clear(field: string): void {
    this.form.controls[field].setValue('');
    this.form.controls[field].markAsDirty();
  }
  save(recalculate = true): void {
    if (this.busy() || this.uncertain()) return;
    this.error.set('');
    this.message.set('');
    try {
      const changes: Record<string, unknown> = {};
      for (const field of this.fields)
        if (this.form.controls[field.key].dirty)
          changes[field.key] = editorValue(field, this.form.controls[field.key].value);
      if (!Object.keys(changes).length) throw new Error('Нет изменённых параметров.');
      this.remember();
      this.busy.set(true);
      this.form.disable({ emitEvent: false });
      this.api
        .saveEditor(
          this.offer(),
          this.drafts.versions.get(this.offer()) || this.config()!.version,
          changes,
          recalculate,
        )
        .pipe(takeUntilDestroyed(this.destroy))
        .subscribe({
          next: (result) => {
            this.busy.set(false);
            this.form.enable({ emitEvent: false });
            this.clearRemembered();
            this.form.markAsPristine();
            this.message.set(
              result.calculation?.ok === false
                ? 'Параметры сохранены; для расчёта ещё нужны данные.'
                : 'Сохранено в копии v2.',
            );
            this.saved.emit();
            this.load();
          },
          error: (error) => {
            this.busy.set(false);
            this.form.enable({ emitEvent: false });
            this.error.set(errorMessage(error));
            this.uncertain.set(true);
          },
        });
    } catch (error) {
      this.error.set(errorMessage(error));
    }
  }
  saveWorking(reset = false): void {
    if (this.busy() || this.uncertain()) return;
    this.error.set('');
    this.message.set('');
    if (Object.values(this.form.controls).some((control) => control.dirty)) {
      this.error.set('Сначала сохраните изменённые параметры расчёта.');
      return;
    }
    try {
      const field = this.workingForm.controls.field.value;
      const value = reset
        ? { reset: true, reset_field: field }
        : {
            [field]: editorValue(
              {
                key: field,
                label: 'Рабочее значение',
                kind: field === 'margin' ? 'rate' : 'number',
                nullable: false,
              },
              this.workingForm.controls.value.value,
            ),
          };
      this.busy.set(true);
      this.api
        .working(this.offer(), this.config()!.version, value)
        .pipe(takeUntilDestroyed(this.destroy))
        .subscribe({
          next: () => {
            this.busy.set(false);
            this.saved.emit();
            this.message.set('Цена и целевая маржа пересчитаны в копии v2.');
            this.load();
          },
          error: (error) => {
            this.busy.set(false);
            this.error.set(errorMessage(error));
            this.uncertain.set(true);
          },
        });
    } catch (error) {
      this.error.set(errorMessage(error));
    }
  }
}
