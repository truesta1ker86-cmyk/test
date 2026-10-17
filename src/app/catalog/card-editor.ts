import { ProductName } from '../shared/product-name';
import {
  AfterViewInit,
  Component,
  DestroyRef,
  ElementRef,
  Injectable,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { FormControl, FormGroup, FormRecord, ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CatalogApi } from './api';
import { CardWorkspace, CatalogRow } from './contracts';
import { errorMessage } from '../core/api';
import { SessionContext } from '../core/session-context';
import { date } from '../core/format';

interface Draft {
  version: string;
  fields: Record<string, string>;
  attributes: Record<string, string>;
}
@Injectable({ providedIn: 'root' })
export class CardDrafts {
  readonly values = new Map<string, Draft>();
}

@Component({
  selector: 'app-card-editor',
  imports: [ProductName, ReactiveFormsModule],
  templateUrl: './card-editor.html',
  styleUrl: './catalog-dialog.css',
})
export class CardEditor implements AfterViewInit {
  readonly row = input.required<CatalogRow>();
  readonly canManage = input(false);
  readonly closed = output<void>();
  readonly workspace = signal<CardWorkspace | null>(null);
  readonly loading = signal(true);
  readonly busy = signal(false);
  readonly uncertain = signal(false);
  readonly error = signal('');
  readonly message = signal('');
  readonly date = date;
  readonly fields = [
    { key: 'name', label: 'Название', type: 'text', max: 500 },
    { key: 'barcode', label: 'Штрихкод', type: 'text', max: 100 },
    { key: 'weight', label: 'Вес упаковки, кг', type: 'number', max: 1000000 },
    { key: 'length', label: 'Длина, мм', type: 'number', max: 1000000 },
    { key: 'width', label: 'Ширина, мм', type: 'number', max: 1000000 },
    { key: 'height', label: 'Высота, мм', type: 'number', max: 1000000 },
  ] as const;
  readonly form = new FormGroup<Record<string, FormControl<string>>>(
    Object.fromEntries(
      ['name', 'barcode', 'weight', 'length', 'width', 'height', 'description', 'images'].map(
        (key) => [key, new FormControl('', { nonNullable: true })],
      ),
    ),
  );
  readonly attributes = new FormRecord<FormControl<string>>({});
  private readonly api = inject(CatalogApi);
  private readonly drafts = inject(CardDrafts);
  private readonly context = inject(SessionContext);
  private readonly destroy = inject(DestroyRef);
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');
  private expectedVersion = '';
  private key(): string {
    return `${this.context.session()?.tenant_id}:${this.row().offer_id}`;
  }

  ngAfterViewInit(): void {
    this.dialog().nativeElement.showModal();
    this.load();
  }
  load(): void {
    this.loading.set(true);
    this.error.set('');
    this.api
      .card(this.row().offer_id)
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (value) => {
          this.fill(value);
          this.loading.set(false);
        },
        error: (error) => {
          this.loading.set(false);
          this.error.set(errorMessage(error));
        },
      });
  }
  private fill(value: CardWorkspace): void {
    this.workspace.set(value);
    this.expectedVersion = value.version;
    const payload = value.working_copy;
    for (const [key, control] of Object.entries(this.form.controls)) {
      const field = payload[key as keyof typeof payload];
      control.setValue(key === 'images' ? (payload.images || []).join('\n') : String(field ?? ''));
      control.markAsPristine();
    }
    for (const key of Object.keys(this.attributes.controls)) this.attributes.removeControl(key);
    for (const attribute of payload.attributes || []) {
      if (attribute.values.some((v) => v.dictionary_value_id)) continue;
      this.attributes.addControl(
        String(attribute.id),
        new FormControl(attribute.values.map((v) => v.value || '').join('\n'), {
          nonNullable: true,
        }),
      );
    }
    const draft = this.drafts.values.get(this.key());
    if (draft) {
      this.expectedVersion = draft.version;
      for (const [key, text] of Object.entries(draft.fields)) {
        this.form.controls[key]?.setValue(text);
        this.form.controls[key]?.markAsDirty();
      }
      for (const [key, text] of Object.entries(draft.attributes)) {
        this.attributes.controls[key]?.setValue(text);
        this.attributes.controls[key]?.markAsDirty();
      }
      this.message.set('Восстановлен ваш несохранённый черновик.');
    }
  }
  private dirty(form: FormGroup<Record<string, FormControl<string>>>): Record<string, string> {
    return Object.fromEntries(
      Object.entries(form.controls)
        .filter(([, value]) => value.dirty)
        .map(([key, value]) => [key, value.value]),
    );
  }
  private remember(): void {
    const fields = this.dirty(this.form),
      attributes = this.dirty(this.attributes);
    if (Object.keys(fields).length || Object.keys(attributes).length)
      this.drafts.values.set(this.key(), { version: this.expectedVersion, fields, attributes });
  }
  close(event?: Event): void {
    event?.preventDefault();
    if (this.busy()) return;
    this.remember();
    this.dialog().nativeElement.close();
    this.closed.emit();
  }
  discard(): void {
    this.drafts.values.delete(this.key());
    this.form.markAsPristine();
    this.attributes.markAsPristine();
    this.message.set('');
    this.uncertain.set(false);
    this.load();
  }
  attributeName(id: number): string {
    return (
      this.workspace()?.attributes_meta.find((a) => a.id === id)?.name || `Характеристика ${id}`
    );
  }
  save(): void {
    if (this.busy() || this.uncertain() || !this.workspace()) return;
    const changes: Record<string, unknown> = {};
    try {
      for (const [key, value] of Object.entries(this.dirty(this.form))) {
        const text = value.trim();
        if (key === 'images') {
          changes[key] = text
            .split('\n')
            .map((v) => v.trim())
            .filter(Boolean);
          continue;
        }
        if (['weight', 'length', 'width', 'height'].includes(key)) {
          if (!text) {
            changes[key] = null;
            continue;
          }
          const n = Number(text.replace(',', '.'));
          if (
            !Number.isFinite(n) ||
            n <= 0 ||
            n > 1000000 ||
            (key !== 'weight' && !Number.isInteger(n))
          )
            throw new Error(
              'Проверьте вес и размеры упаковки. Размеры указываются целыми миллиметрами.',
            );
          changes[key] = key === 'weight' ? text.replace(',', '.') : n;
        } else changes[key] = text || null;
      }
      const attributeChanges = this.dirty(this.attributes);
      if (Object.keys(attributeChanges).length)
        changes['attributes'] = (this.workspace()?.working_copy.attributes || []).map(
          (attribute) =>
            Object.hasOwn(attributeChanges, attribute.id)
              ? {
                  ...attribute,
                  values: attributeChanges[String(attribute.id)]
                    .split('\n')
                    .filter((v) => v.trim())
                    .map((value) => ({ value: value.trim() })),
                }
              : attribute,
        );
      if (!Object.keys(changes).length) throw new Error('Сначала измените поля карточки.');
      if ('name' in changes && !changes['name']) throw new Error('Укажите название товара.');
    } catch (error) {
      this.error.set(errorMessage(error));
      return;
    }
    this.busy.set(true);
    this.error.set('');
    this.message.set('');
    this.api
      .saveCard(this.row().offer_id, this.expectedVersion, changes)
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (result) => {
          this.drafts.values.delete(this.key());
          this.fill(result);
          this.busy.set(false);
          this.message.set('Локальная версия карточки сохранена в v2.');
        },
        error: (error) => {
          this.busy.set(false);
          this.error.set(errorMessage(error));
          this.remember();
          this.uncertain.set(true);
        },
      });
  }
  inspectSaved(): void {
    this.api
      .card(this.row().offer_id)
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (value) => {
          const changed = value.version !== this.expectedVersion;
          this.workspace.set(value);
          this.uncertain.set(false);
          this.message.set(
            changed
              ? 'На сервере есть новая версия. Сверьте историю ниже; для нового сохранения откройте свежую карточку и перенесите нужные правки.'
              : 'Серверная версия не изменилась; сохранение можно повторить.',
          );
        },
        error: (error) => this.error.set(errorMessage(error)),
      });
  }
}
