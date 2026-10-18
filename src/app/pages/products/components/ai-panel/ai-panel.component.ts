import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { FormControl } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { firstValueFrom } from 'rxjs';
import { CardsApi } from '../../infrastructure/services/cards-api.service';
import type {
  AiResult,
  AiStatus,
  AttributeDefinition,
  FullPayload,
  MediaItem,
  Attribute,
} from '../../infrastructure/interfaces/contracts.interfaces';
import { errorMessage } from '../../../../core/infrastructure/utils/api.utils';
import { date, money } from '../../../../core/infrastructure/utils/format.utils';

@Component({
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush,

  selector: 'app-card-ai',

  templateUrl: './ai-panel.component.html',
  styleUrl: './ai-panel.component.css',
})
export class AiPanel {
  readonly offer = input.required<string>();
  readonly payload = input.required<FullPayload>();
  readonly definitions = input.required<AttributeDefinition[]>();
  readonly canManage = input(false);
  readonly localPreview = input(false);
  readonly mode = input<'content' | 'attributes' | 'image'>('content');
  readonly statusLoaded = output<AiStatus>();
  readonly applied = output<{
    title?: string;
    description?: string;
    attributes?: Attribute[];
    media?: MediaItem;
  }>();
  readonly info = signal<AiStatus | null>(null);
  readonly history = signal<AiResult[]>([]);
  readonly result = signal<AiResult | null>(null);
  readonly busy = signal(false);
  readonly accepting = signal(false);
  readonly error = signal('');
  readonly message = signal('');
  readonly uncertain = signal(false);
  readonly kind = new FormControl<'content' | 'attributes' | 'image'>('content', {
    nonNullable: true,
  });
  readonly brief = new FormControl('', { nonNullable: true });
  readonly reference = new FormControl<'none' | 'product'>('none', { nonNullable: true });
  readonly aspect = new FormControl('1:1', { nonNullable: true });
  readonly quality = new FormControl('auto', { nonNullable: true });
  readonly proposedTitle = new FormControl('', { nonNullable: true });
  readonly proposedDescription = new FormControl('', { nonNullable: true });
  readonly suggestionForms = signal<
    { id: number; name: string; values: FormControl<string>; selected: FormControl<boolean> }[]
  >([]);
  readonly money = money;
  readonly date = date;
  private readonly api = inject(CardsApi);
  private readonly destroy = inject(DestroyRef);
  private pendingId = '';
  private resultCategory = 0;
  private resultType = 0;
  private previousKind: 'content' | 'attributes' | 'image' = 'content';
  private briefs = new Map<string, string>();
  constructor() {
    this.kind.valueChanges.pipe(takeUntilDestroyed(this.destroy)).subscribe((kind) => {
      if (kind === this.previousKind) return;
      this.briefs.set(this.previousKind, this.brief.value);
      this.brief.setValue(this.briefs.get(kind) || '');
      this.previousKind = kind;
    });
    effect(() => this.kind.setValue(this.mode()));
    queueMicrotask(() => this.load());
  }
  load() {
    this.api
      .aiStatus()
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (data) => {
          this.info.set(data);
          this.statusLoaded.emit(data);
        },
        error: (error) => this.error.set(errorMessage(error)),
      });
    this.api
      .aiHistory(this.offer())
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (data) => this.history.set(data.items),
        error: (error) => this.error.set(errorMessage(error)),
      });
  }
  operation() {
    return this.info()?.operations.find((op) => op.kind === this.kind.value);
  }
  generate() {
    const payload = this.payload(),
      op = this.operation();
    if (this.localPreview() || this.busy() || !this.canManage() || !op?.available) return;
    if (!payload.description_category_id || !payload.type_id) {
      this.error.set('Сначала выберите категорию и тип товара.');
      return;
    }
    if (this.kind.value === 'image' && !this.brief.value.trim()) {
      this.error.set('Опишите, какое фото требуется создать.');
      return;
    }
    this.pendingId = crypto.randomUUID().replaceAll('-', '');
    this.resultCategory = payload.description_category_id;
    this.resultType = payload.type_id;
    this.busy.set(true);
    this.error.set('');
    this.message.set('');
    this.uncertain.set(false);
    this.api
      .aiGenerate({
        operation_id: this.pendingId,
        offer_id: this.offer(),
        kind: this.kind.value,
        title: payload.name,
        description: payload.description || '',
        brief: this.brief.value,
        category_id: payload.description_category_id,
        type_id: payload.type_id,
        attributes: payload.attributes || [],
        reference_source: this.reference.value,
        aspect_ratio: this.aspect.value,
        quality: this.quality.value,
      })
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (result) => this.receive(result),
        error: (error) => {
          this.busy.set(false);
          this.uncertain.set(true);
          this.error.set(
            errorMessage(error) + ' Проверьте результат операции перед повторной генерацией.',
          );
        },
      });
  }
  check() {
    if (!this.pendingId || this.busy()) return;
    this.busy.set(true);
    this.api
      .aiOperation(this.pendingId)
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (result) => this.receive(result),
        error: (error) => {
          this.busy.set(false);
          this.error.set(errorMessage(error));
        },
      });
  }
  private receive(result: AiResult) {
    this.busy.set(false);
    this.uncertain.set(result.status === 'running');
    this.result.set(result);
    if (result.status === 'running') {
      this.message.set(
        'Запрос ещё выполняется. Можно продолжить работу и проверить результат позже.',
      );
      return;
    }
    if (result.status === 'failed') {
      this.error.set(result.error || 'Не удалось создать AI-предложение.');
      this.load();
      return;
    }
    this.proposedTitle.setValue(result.result?.title || '');
    this.proposedDescription.setValue(result.result?.description || '');
    this.suggestionForms.set(
      (result.result?.suggestions || []).map((s) => ({
        id: s.attribute_id,
        name:
          this.definitions().find((d) => d.attribute_id === s.attribute_id)?.name ||
          s.name ||
          String(s.attribute_id),
        values: new FormControl(s.values.join('\n'), { nonNullable: true }),
        selected: new FormControl(true, { nonNullable: true }),
      })),
    );
    this.message.set('Предложение готово. Проверьте факты и выберите, что перенести в карточку.');
    this.load();
  }
  open(result: AiResult) {
    this.pendingId = result.operation_id;
    this.resultCategory = result.category_id;
    this.resultType = result.type_id;
    this.receive(result);
  }
  async accept() {
    const current = this.result();
    if (
      !current ||
      !this.canManage() ||
      this.accepting() ||
      current.accepted === true ||
      current.accepted === false
    )
      return;
    if (
      this.resultCategory !== this.payload().description_category_id ||
      this.resultType !== this.payload().type_id
    ) {
      this.error.set(
        'Категория изменилась после генерации. Сверьте предложение с новой категорией.',
      );
      return;
    }
    this.accepting.set(true);
    this.error.set('');
    try {
      const change: {
        title?: string;
        description?: string;
        attributes?: Attribute[];
        media?: MediaItem;
      } = {};
      if (current.kind === 'content') {
        change.title = this.proposedTitle.value.trim();
        change.description = this.proposedDescription.value.trim();
        if (!change.title) throw new Error('Название не может быть пустым.');
      }
      if (current.kind === 'image' && current.result?.media) change.media = current.result.media;
      if (current.kind === 'attributes') {
        const attributes: Attribute[] = [];
        for (const suggestion of this.suggestionForms().filter((s) => s.selected.value)) {
          const definition = this.definitions().find((d) => d.attribute_id === suggestion.id);
          if (!definition)
            throw new Error('Одно из предложенных полей отсутствует в текущей категории.');
          const texts = suggestion.values.value
            .split('\n')
            .map((v) => v.trim())
            .filter(Boolean);
          if (!texts.length) continue;
          const values: Attribute['values'] = [];
          for (const text of texts) {
            if (!definition.dictionary_id) {
              values.push({ value: text });
              continue;
            }
            const response = await firstValueFrom(
              this.api.dictionary(this.resultCategory, this.resultType, suggestion.id, text),
            );
            const matches = response.items.filter(
              (v) => v.value.trim().toLocaleLowerCase('ru') === text.toLocaleLowerCase('ru'),
            );
            if (matches.length !== 1)
              throw new Error(
                `«${definition.name}»: для «${text}» нет однозначного значения. Исправьте предложение, снимите выбор поля или задайте значение в разделе свойств.`,
              );
            values.push({ value: matches[0].value, dictionary_value_id: matches[0].id });
          }
          attributes.push({ id: suggestion.id, values });
        }
        change.attributes = attributes;
      }
      const reviewed = await firstValueFrom(this.api.aiReview(current.operation_id, true));
      this.result.set(reviewed);
      if (reviewed.result?.media) change.media = reviewed.result.media;
      this.applied.emit(change);
      this.message.set('Предложение принято в редактор. Изменения ещё нужно сохранить в карточке.');
      this.load();
    } catch (error) {
      this.error.set(errorMessage(error));
    } finally {
      this.accepting.set(false);
    }
  }
  reject() {
    const result = this.result();
    if (!result || result.accepted === true || result.accepted === false || !this.canManage())
      return;
    this.api
      .aiReview(result.operation_id, false)
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (reviewed) => {
          this.result.set(reviewed);
          this.message.set('Предложение отклонено. Карточка не изменена.');
          this.load();
        },
        error: (error) => this.error.set(errorMessage(error)),
      });
  }
}
