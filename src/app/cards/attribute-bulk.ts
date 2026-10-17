import { ProductName } from '../shared/product-preview/directives/product-name.directive';
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
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CardsApi } from './api';
import { AttributeDefinition, AttributeOperation, Category } from './contracts';
import { Attribute } from '../catalog/contracts';
import { AttributeField } from './attribute-field';
import { date } from '../core/format';
import { errorMessage } from '../core/api';
@Component({
  selector: 'app-attribute-bulk',
  imports: [ProductName, ReactiveFormsModule, AttributeField],
  templateUrl: './attribute-bulk.html',
  styleUrl: './attribute-bulk.css',
})
export class AttributeBulk implements AfterViewInit {
  readonly offers = input.required<string[]>();
  readonly canManage = input(false);
  readonly closed = output<void>();
  readonly saved = output<void>();
  readonly busy = signal(false);
  readonly error = signal('');
  readonly message = signal('');
  readonly uncertain = signal(false);
  readonly categories = signal<Category[]>([]);
  readonly definitions = signal<AttributeDefinition[]>([]);
  readonly category = signal<Category | null>(null);
  readonly definition = signal<AttributeDefinition | null>(null);
  readonly value = signal<Attribute | undefined>(undefined);
  readonly preview = signal<AttributeOperation | null>(null);
  readonly history = signal<AttributeOperation[]>([]);
  readonly sourceOffer = new FormControl('', { nonNullable: true });
  private categoryRequest = 0;
  readonly search = new FormControl('', { nonNullable: true });
  readonly categoryValue = new FormControl('', { nonNullable: true });
  readonly field = new FormControl('', { nonNullable: true });
  readonly clear = new FormControl(false, { nonNullable: true });
  readonly includeLocked = new FormControl(false, { nonNullable: true });
  readonly date = date;
  private readonly api = inject(CardsApi);
  private readonly destroy = inject(DestroyRef);
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');
  constructor() {
    this.categoryValue.valueChanges.pipe(takeUntilDestroyed(this.destroy)).subscribe((value) => {
      const c = this.categories().find(
        (c) => `${c.description_category_id}:${c.type_id}` === value,
      );
      if (c) this.chooseCategory(c);
    });
    this.field.valueChanges.pipe(takeUntilDestroyed(this.destroy)).subscribe((value) => {
      this.definition.set(this.definitions().find((d) => d.attribute_id === Number(value)) || null);
      this.value.set(undefined);
      this.preview.set(null);
    });
    for (const control of [this.clear, this.includeLocked])
      control.valueChanges
        .pipe(takeUntilDestroyed(this.destroy))
        .subscribe(() => this.preview.set(null));
  }
  ngAfterViewInit() {
    this.dialog().nativeElement.showModal();
    if (!this.offers().length) {
      this.loadHistory();
      return;
    }
    this.findCategories();
    this.loadHistory();
    this.api
      .workspace(this.offers()[0])
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (card) => {
          if (card.working_copy.description_category_id && card.working_copy.type_id)
            this.chooseCategory({
              description_category_id: card.working_copy.description_category_id,
              type_id: card.working_copy.type_id,
              category_name: card.category?.name || null,
              type_name: card.category?.type_name || null,
              path: card.category?.path || null,
            });
        },
        error: (error) => this.error.set(errorMessage(error)),
      });
  }
  close(event?: Event) {
    event?.preventDefault();
    if (this.busy()) return;
    this.dialog().nativeElement.close();
    this.closed.emit();
  }
  findCategories() {
    this.api
      .categories(this.search.value)
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (data) => {
          const c = this.category();
          const all =
            c &&
            !data.items.some(
              (i) =>
                i.description_category_id === c.description_category_id && i.type_id === c.type_id,
            )
              ? [c, ...data.items]
              : data.items;
          this.categories.set(all);
          if (c)
            this.categoryValue.setValue(`${c.description_category_id}:${c.type_id}`, {
              emitEvent: false,
            });
        },
        error: (error) => this.error.set(errorMessage(error)),
      });
  }
  chooseCategory(category: Category) {
    const request = ++this.categoryRequest;
    this.category.set(category);
    this.preview.set(null);
    this.definition.set(null);
    this.value.set(undefined);
    this.categoryValue.setValue(`${category.description_category_id}:${category.type_id}`, {
      emitEvent: false,
    });
    this.api
      .attributes(category.description_category_id, category.type_id)
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (data) => {
          if (request === this.categoryRequest)
            this.definitions.set(data.items.filter((d) => !d.attribute_complex_id));
        },
        error: (error) => this.error.set(errorMessage(error)),
      });
  }
  changed(value: Attribute) {
    this.value.set(value);
    this.preview.set(null);
  }
  copyFromSource() {
    const offer = this.sourceOffer.value,
      definition = this.definition(),
      category = this.category();
    if (!offer || !definition || !category) {
      this.error.set('Выберите товар-источник и характеристику.');
      return;
    }
    this.api
      .workspace(offer)
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (card) => {
          if (this.category() !== category || this.definition() !== definition) return;
          if (
            card.working_copy.description_category_id !== category.description_category_id ||
            card.working_copy.type_id !== category.type_id
          ) {
            this.error.set('Категория источника отличается от выбранной.');
            return;
          }
          const attribute = card.working_copy.attributes?.find(
            (a) => a.id === definition.attribute_id,
          );
          if (!attribute?.values.length) {
            this.error.set('У источника нет значения этой характеристики.');
            return;
          }
          this.clear.setValue(false);
          this.value.set(structuredClone(attribute));
          this.preview.set(null);
          this.message.set('Значение скопировано в форму. Проверьте изменения перед применением.');
        },
        error: (e) => this.error.set(errorMessage(e)),
      });
  }
  check() {
    const c = this.category(),
      d = this.definition();
    if (!c || !d) {
      this.error.set('Выберите категорию и характеристику.');
      return;
    }
    if (!this.clear.value && !this.value()?.values.length) {
      this.error.set('Укажите новое значение или выберите очистку поля.');
      return;
    }
    this.busy.set(true);
    this.error.set('');
    this.api
      .attributePreview({
        offer_ids: this.offers(),
        category_id: c.description_category_id,
        type_id: c.type_id,
        attribute_id: d.attribute_id,
        values: this.clear.value ? [] : this.value()!.values,
        clear: this.clear.value,
        include_locked: this.includeLocked.value,
      })
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (result) => {
          this.preview.set(result);
          this.busy.set(false);
        },
        error: (error) => {
          this.error.set(errorMessage(error));
          this.busy.set(false);
        },
      });
  }
  apply() {
    const p = this.preview();
    if (!p || this.busy() || this.uncertain()) return;
    const expires = Date.parse(p.expires_at);
    if (!Number.isFinite(expires) || expires <= Date.now()) {
      this.preview.set(null);
      this.error.set('Предпросмотр истёк. Проверьте изменения заново.');
      return;
    }
    this.busy.set(true);
    this.api
      .attributeApply(p.operation_id)
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: () => {
          this.busy.set(false);
          this.saved.emit();
        },
        error: (error) => {
          this.busy.set(false);
          this.uncertain.set(true);
          this.error.set(errorMessage(error));
          this.checkResult();
        },
      });
  }
  checkResult() {
    const p = this.preview();
    if (!p || this.busy()) return;
    this.busy.set(true);
    this.api
      .attributeOperation(p.operation_id)
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (result) => {
          this.busy.set(false);
          this.uncertain.set(false);
          if (result.status === 'applied') this.saved.emit();
          else {
            this.preview.set(null);
            this.error.set('Изменение ещё не применено. Создайте свежий предпросмотр.');
          }
        },
        error: (error) => {
          this.busy.set(false);
          this.error.set(errorMessage(error));
        },
      });
  }
  loadHistory() {
    this.api
      .attributeOperations()
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (data) => this.history.set(data.items),
        error: (error) => this.error.set(errorMessage(error)),
      });
  }
  undo(operation: AttributeOperation) {
    if (this.busy()) return;
    this.busy.set(true);
    this.api
      .attributeUndo(operation.operation_id)
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (result) => {
          this.busy.set(false);
          this.message.set(
            `Отменено: ${result.undone}, сохранено последующих изменений: ${result.conflicts}.`,
          );
          this.loadHistory();
        },
        error: (error) => {
          this.busy.set(false);
          this.error.set(errorMessage(error));
          this.loadHistory();
        },
      });
  }
  values(value: Attribute | null) {
    return value
      ? value.values.map((v) => v.value || `Значение ${v.dictionary_value_id}`).join(', ')
      : 'Не задано';
  }
}
