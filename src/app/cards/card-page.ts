import { ProductName } from '../shared/product-name';
import {
  Component,
  DestroyRef,
  Injectable,
  OnDestroy,
  computed,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { debounceTime } from 'rxjs';
import { SessionContext } from '../core/session-context';
import { errorMessage } from '../core/api';
import { date, money } from '../core/format';
import { CatalogApi } from '../catalog/api';
import { CatalogActions } from '../catalog/catalog-actions';
import { CatalogRow, Attribute } from '../catalog/contracts';
import { CardsApi } from './api';
import { AttributeField } from './attribute-field';
import { AiPanel } from './ai-panel';
import { Gallery } from './gallery';
import { CardOneC, CardOneCChoice } from './card-onec';
import { AiStatus } from './contracts';
import {
  AttributeDefinition,
  Category,
  CategoryPreview,
  ComplexGroup,
  FullPayload,
  FullWorkspace,
  MediaItem,
  Validation,
} from './contracts';

interface LocalDraft {
  version: string;
  base: FullPayload;
  fields: Record<string, string>;
  attributes: Attribute[];
  complex: ComplexGroup[];
  images: string[];
  categoryConfirmed: boolean;
  discardComplex: boolean;
}
@Injectable({ providedIn: 'root' })
export class CardLocalDrafts {
  private readonly values = new Map<string, LocalDraft>();
  get(key: string): LocalDraft | undefined {
    try {
      return this.values.get(key) || JSON.parse(sessionStorage.getItem(key) || 'null') || undefined;
    } catch {
      return undefined;
    }
  }
  put(key: string, value: LocalDraft) {
    this.values.set(key, value);
    try {
      sessionStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* In-memory draft remains available when browser storage is full. */
    }
  }
  remove(key: string) {
    this.values.delete(key);
    try {
      sessionStorage.removeItem(key);
    } catch {
      /* Storage can be disabled. */
    }
  }
}

@Component({
  selector: 'app-full-card-page',
  imports: [
    ProductName,
    RouterLink,
    ReactiveFormsModule,
    AttributeField,
    AiPanel,
    Gallery,
    CatalogActions,
    CardOneC,
  ],
  templateUrl: './card-page.html',
  styleUrls: ['./card-page.css', './card-workflow.css'],
})
export class CardPage implements OnDestroy {
  private readonly catalogApi = inject(CatalogApi);
  readonly binding = signal<CatalogRow | null>(null);
  readonly bindingError = signal('');
  readonly bindingEditor = signal(false);
  private readonly api = inject(CardsApi);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  readonly context = inject(SessionContext);
  private readonly drafts = inject(CardLocalDrafts);
  private readonly destroy = inject(DestroyRef);
  private readonly tenantId = this.context.session()!.tenant_id;
  readonly isCreate = this.route.snapshot.routeConfig?.path === 'products/create';
  readonly workspace = signal<FullWorkspace | null>(null);
  readonly offer = signal('');
  readonly loading = signal(false);
  readonly busy = signal(false);
  readonly uploading = signal(false);
  readonly dirty = signal(false);
  readonly uncertain = signal(false);
  readonly conflict = signal(false);
  readonly error = signal('');
  readonly message = signal('');
  readonly section = signal(this.isCreate ? 'onec' : 'content');
  readonly aiInfo = signal<AiStatus | null>(null);
  readonly aiOpen = signal(false);
  readonly historyOpen = signal(false);
  readonly sidebarCategory = signal<number | null>(null);
  readonly sidebarCategoryControl = new FormControl('0', { nonNullable: true });
  readonly sidebarTypeControl = new FormControl('0', { nonNullable: true });
  readonly sidebarCategoryId = computed(() => this.sidebarCategory() ?? this.categoryId());
  readonly sidebarCategories = computed(() => [
    ...new Map(this.categoryCatalog().map((c) => [c.description_category_id, c])).values(),
  ]);
  readonly sidebarTypes = computed(() =>
    this.categoryCatalog().filter((c) => c.description_category_id === this.sidebarCategoryId()),
  );
  readonly attributes = signal<Attribute[]>([]);
  readonly definitions = signal<AttributeDefinition[]>([]);
  readonly complex = signal<ComplexGroup[]>([]);
  readonly images = signal<string[]>([]);
  readonly media = signal<MediaItem[]>([]);
  readonly categories = signal<Category[]>([]);
  readonly categoryCatalog = signal<Category[]>([]);
  readonly categoryLoading = signal(false);
  readonly categoryPreview = signal<CategoryPreview | null>(null);
  readonly pendingCategory = signal<Category | null>(null);
  readonly categoryLabel = signal('Категория ещё не выбрана');
  readonly validation = signal<Validation | null>(null);
  readonly attributeFilter = signal('all');
  readonly searchText = signal('');
  readonly categorySearch = new FormControl('', { nonNullable: true });
  readonly attributeSearch = new FormControl('', { nonNullable: true });
  readonly createForm = new FormGroup({
    offer: new FormControl('', { nonNullable: true }),
    name: new FormControl('', { nonNullable: true }),
  });
  readonly form = new FormGroup<Record<string, FormControl<string>>>(
    Object.fromEntries(
      [
        'name',
        'description',
        'barcode',
        'weight',
        'length',
        'width',
        'height',
        'price',
        'old_price',
        'vat',
        'color_image',
        'description_category_id',
        'type_id',
      ].map((k) => [k, new FormControl('', { nonNullable: true })]),
    ),
  );
  readonly formValues = signal<Record<string, string>>({});
  readonly tabs = [
    { id: 'onec', name: 'Товар из 1С' },
    { id: 'image', name: 'Изображение' },
    { id: 'content', name: 'Номенклатура и описание' },
    { id: 'attributes', name: 'Характеристики' },
    { id: 'review', name: 'Проверка' },
  ];
  readonly readiness = computed(() => {
    const fields = this.formValues(),
      missing = this.definitions().filter((d) => {
        if (!d.is_required) return false;
        const values = d.attribute_complex_id
          ? this.complex().flatMap((g) =>
              g.attributes.filter((a) => a.id === d.attribute_id).flatMap((a) => a.values),
            )
          : this.attribute(d.attribute_id)?.values || [];
        return !values.some((v) => (v.dictionary_value_id || 0) > 0 || !!v.value?.trim());
      }).length;
    return {
      onec: this.binding()?.mapping_status === 'verified',
      image: this.images().length > 0,
      content: !!fields['name']?.trim() && !!fields['description']?.trim(),
      attributes:
        !!this.categoryId() && !!this.typeId() && this.definitions().length > 0 && missing === 0,
      review: !this.dirty() && !!this.workspace()?.versions.length,
    };
  });
  stepReady(id: string) {
    return this.readiness()[id as keyof ReturnType<typeof this.readiness>];
  }
  readonly dimensions = [
    { key: 'weight', name: 'Вес упаковки, кг', step: 'any' },
    { key: 'length', name: 'Длина, мм', step: '1' },
    { key: 'width', name: 'Ширина, мм', step: '1' },
    { key: 'height', name: 'Высота, мм', step: '1' },
  ];
  readonly date = date;
  readonly money = money;
  readonly canManage = computed(() => {
    const s = this.context.session();
    return !!s && (s.is_owner || s.role === 'manager');
  });
  readonly title = computed(
    () => this.formValues()['name'] || this.workspace()?.working_copy.name || 'Новая карточка',
  );
  readonly categoryId = computed(() => Number(this.formValues()['description_category_id']) || 0);
  readonly typeId = computed(() => Number(this.formValues()['type_id']) || 0);
  readonly visibleDefinitions = computed(() =>
    this.definitions().filter(
      (d) =>
        !d.attribute_complex_id &&
        (!this.searchText() || d.name.toLocaleLowerCase('ru').includes(this.searchText())) &&
        (this.attributeFilter() !== 'required' || d.is_required) &&
        (this.attributeFilter() !== 'missing' || !this.attribute(d.attribute_id)?.values.length),
    ),
  );
  readonly complexTypes = computed(() => [
    ...new Set(
      this.definitions()
        .map((d) => d.attribute_complex_id)
        .filter((id) => id > 0),
    ),
  ]);
  private expectedVersion = '';
  private base: FullPayload | null = null;
  private categoryConfirmed = false;
  readonly discardComplex = signal(false);
  private loaded = false;
  private loadRequest = 0;
  private categoryRequest = 0;
  private previewCategoryRequest = 0;

  constructor() {
    this.form.valueChanges.pipe(takeUntilDestroyed(this.destroy)).subscribe(() => {
      this.formValues.set(this.rawFields());
      if (this.loaded) {
        this.dirty.set(true);
        this.validation.set(null);
      }
    });
    this.form.valueChanges
      .pipe(debounceTime(250), takeUntilDestroyed(this.destroy))
      .subscribe(() => this.remember());
    this.attributeSearch.valueChanges
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe((q) => this.searchText.set(q.toLocaleLowerCase('ru').trim()));
    this.categorySearch.valueChanges
      .pipe(debounceTime(250), takeUntilDestroyed(this.destroy))
      .subscribe(() => this.findCategories());
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroy)).subscribe((params) => {
      if (params.get('section') === 'history') this.historyOpen.set(true);
      if (params.get('section') === 'ai') this.aiOpen.set(true);
      this.section.set(
        this.normalizeSection(params.get('section') || (this.isCreate ? 'onec' : 'content')),
      );
      if (this.isCreate) {
        const source = params.get('copy_from');
        if (source) this.loadCopy(source);
        return;
      }
      const offer = params.get('offer_id') || '';
      if (offer && offer !== this.offer()) {
        this.remember();
        this.binding.set(null);
        this.uploading.set(false);
        this.offer.set(offer);
        this.busy.set(false);
        this.categoryRequest++;
        this.previewCategoryRequest++;
        this.load();
      } else if (!offer) {
        this.error.set('Выберите товар в каталоге.');
      }
    });
    this.destroy.onDestroy(() => this.remember());
  }
  ngOnDestroy() {
    this.remember();
  }
  private key() {
    return `o1c-v2-card:${this.tenantId}:${this.offer()}`;
  }
  private loadCopy(source: string) {
    this.api
      .workspace(source)
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (data) => this.createForm.controls.name.setValue(data.working_copy.name + ' — копия'),
        error: (error) => this.error.set(errorMessage(error)),
      });
  }
  create(binding?: CardOneCChoice) {
    if (!this.canManage() || this.busy()) return;
    const { offer, name } = this.createForm.getRawValue();
    if (!offer.trim() || !name.trim()) {
      this.error.set('Заполните артикул продавца и название товара.');
      return;
    }
    this.busy.set(true);
    this.error.set('');
    this.api
      .create(
        offer.trim(),
        name.trim(),
        this.route.snapshot.queryParamMap.get('copy_from') || undefined,
        binding
          ? { onec_code: binding.onec_code, units_per_item: binding.units_per_item }
          : undefined,
      )
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (data) => {
          this.busy.set(false);
          void this.router.navigate(['/products/card'], {
            queryParams: { offer_id: data.offer_id, section: binding ? 'image' : 'content' },
          });
        },
        error: (error) => {
          this.busy.set(false);
          this.error.set(errorMessage(error));
        },
      });
  }
  copyCard() {
    if (this.canManage() && !this.dirty() && !this.busy() && !this.uploading())
      void this.router.navigate(['/products/create'], { queryParams: { copy_from: this.offer() } });
  }
  load() {
    const offer = this.offer(),
      request = ++this.loadRequest;
    this.loading.set(true);
    this.error.set('');
    this.loaded = false;
    this.api
      .workspace(this.offer())
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (data) => {
          if (offer !== this.offer() || request !== this.loadRequest) return;
          this.fill(data, true);
          this.loading.set(false);
          this.loadMedia();
          this.loadBinding();
          if (data.local_preview) this.findCategories();
        },
        error: (error) => {
          if (offer !== this.offer() || request !== this.loadRequest) return;
          this.loading.set(false);
          this.error.set(errorMessage(error));
        },
      });
  }
  loadBinding() {
    const offer = this.offer();
    this.bindingError.set('');
    this.catalogApi
      .item(offer)
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (r) => {
          if (offer === this.offer())
            this.binding.set(
              r.row ? { ...r.row, version: r.row.version || String(r.version) } : null,
            );
        },
        error: (e) => {
          if (offer === this.offer()) this.bindingError.set(errorMessage(e));
        },
      });
  }
  bindingSaved() {
    this.loadBinding();
    this.message.set('Связь с 1С сохранена локально. Ввод в карточке сохранён.');
    this.goSection('image');
  }
  private fill(data: FullWorkspace, restoreDraft = false) {
    this.loaded = false;
    this.workspace.set(data);
    if (data.category)
      this.mergeCategories([
        {
          description_category_id: data.category.category_id,
          type_id: data.category.type_id,
          category_name: data.category.name,
          type_name: data.category.type_name,
          path: data.category.path,
        },
      ]);
    this.categoryLabel.set(
      data.category?.path || data.category?.name || 'Категория ещё не выбрана',
    );
    this.expectedVersion = data.version;
    this.base = structuredClone(data.working_copy);
    this.definitions.set(data.attributes_meta);
    this.attributes.set(structuredClone(data.working_copy.attributes || []));
    this.complex.set(structuredClone(data.working_copy.complex_attributes || []));
    this.images.set([...(data.working_copy.images || [])]);
    for (const [key, control] of Object.entries(this.form.controls))
      control.setValue(String(data.working_copy[key as keyof FullPayload] ?? ''), {
        emitEvent: false,
      });
    this.form.markAsPristine();
    this.categoryConfirmed = false;
    this.discardComplex.set(false);
    this.dirty.set(false);
    this.conflict.set(false);
    this.uncertain.set(false);
    this.validation.set(data.validation);
    const draft = restoreDraft ? this.drafts.get(this.key()) : undefined;
    if (draft) {
      this.expectedVersion = draft.version;
      this.base = draft.base;
      for (const [key, value] of Object.entries(draft.fields)) {
        this.form.controls[key]?.setValue(value, { emitEvent: false });
        this.form.controls[key]?.markAsDirty();
      }
      this.attributes.set(draft.attributes);
      this.complex.set(draft.complex);
      this.images.set(draft.images);
      this.categoryConfirmed = draft.categoryConfirmed;
      this.discardComplex.set(draft.discardComplex);
      this.dirty.set(true);
      this.conflict.set(draft.version !== data.version);
      this.message.set('Восстановлен ваш несохранённый черновик.');
      const cat = Number(this.form.controls['description_category_id'].value),
        type = Number(this.form.controls['type_id'].value);
      if (
        cat &&
        type &&
        (cat !== data.working_copy.description_category_id || type !== data.working_copy.type_id)
      ) {
        this.loadDefinitions(cat, type);
        this.categoryLabel.set(`Категория ${cat} · Тип ${type} (несохранённый выбор)`);
      }
    }
    this.formValues.set(this.rawFields());
    this.syncSidebar();
    this.loaded = true;
  }
  private remember() {
    if (!this.loaded || !this.dirty() || !this.base || !this.offer()) return;
    this.drafts.put(this.key(), {
      version: this.expectedVersion,
      base: this.base,
      fields: this.rawFields(),
      attributes: this.attributes(),
      complex: this.complex(),
      images: this.images(),
      categoryConfirmed: this.categoryConfirmed,
      discardComplex: this.discardComplex(),
    });
  }
  resetToSnapshot() {
    const snapshot = this.workspace()?.snapshot;
    if (this.busy() || !snapshot || !this.workspace()?.snapshot_complete) return;
    for (const [key, control] of Object.entries(this.form.controls)) {
      control.setValue(String(snapshot[key as keyof FullPayload] ?? ''), { emitEvent: false });
      control.markAsDirty();
    }
    this.formValues.set(this.rawFields());
    this.attributes.set(structuredClone(snapshot.attributes || []));
    this.complex.set(structuredClone(snapshot.complex_attributes || []));
    this.images.set([...(snapshot.images || [])]);
    this.categoryConfirmed =
      snapshot.description_category_id !== this.base?.description_category_id ||
      snapshot.type_id !== this.base?.type_id;
    this.categoryLabel.set(
      snapshot.description_category_id && snapshot.type_id
        ? `Категория ${snapshot.description_category_id} · Тип ${snapshot.type_id}`
        : 'Категория ещё не выбрана',
    );
    if (snapshot.description_category_id && snapshot.type_id)
      this.loadDefinitions(snapshot.description_category_id, snapshot.type_id);
    this.dirty.set(true);
    this.remember();
    this.message.set('В форму возвращён локальный снимок Ozon. Сохраните черновик после проверки.');
  }
  discard() {
    this.drafts.remove(this.key());
    this.dirty.set(false);
    this.message.set('');
    this.load();
  }
  acceptNewBase() {
    const current = this.workspace();
    if (!current) return;
    this.expectedVersion = current.version;
    this.base = structuredClone(current.working_copy);
    this.conflict.set(false);
    this.categoryConfirmed = false;
    this.message.set(
      'Черновик привязан к свежей версии. Проверьте категорию и сохраните нужные изменения.',
    );
    this.remember();
  }
  goSection(id: string) {
    if (id === 'history') this.historyOpen.set(true);
    if (id === 'ai') this.aiOpen.set(true);
    id = this.normalizeSection(id);
    this.section.set(id);
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { section: id },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }
  private normalizeSection(id: string) {
    const aliases: Record<string, string> = {
      main: 'content',
      media: 'image',
      ai: 'content',
      history: 'review',
    };
    const value = aliases[id] || id;
    return this.tabs.some((tab) => tab.id === value) ? value : 'content';
  }
  nextStep(delta: number) {
    const index = this.tabs.findIndex((tab) => tab.id === this.section());
    const next = this.tabs[index + delta];
    if (next) this.goSection(next.id);
  }
  prefillFromOneC(choice: CardOneCChoice) {
    if (!this.createForm.controls.name.dirty) this.createForm.controls.name.setValue(choice.name);
  }
  chooseSidebarType(raw: string) {
    const category = this.categoryCatalog().find(
      (c) => c.description_category_id === this.sidebarCategoryId() && c.type_id === Number(raw),
    );
    if (category) {
      this.selectCategory(category);
      this.goSection('attributes');
    }
  }
  cancelCategory() {
    this.categoryPreview.set(null);
    this.pendingCategory.set(null);
    this.sidebarCategory.set(null);
    this.syncSidebar();
  }
  changeSidebarCategory(raw: string) {
    this.sidebarCategory.set(Number(raw) || 0);
    this.sidebarTypeControl.setValue('0');
  }
  private syncSidebar() {
    this.sidebarCategory.set(null);
    this.sidebarCategoryControl.setValue(String(this.categoryId()), { emitEvent: false });
    this.sidebarTypeControl.setValue(String(this.typeId()), { emitEvent: false });
  }
  change(key: string, value: string) {
    this.form.controls[key].setValue(value);
    this.form.controls[key].markAsDirty();
  }
  attribute(id: number) {
    return this.attributes().find((a) => a.id === id);
  }
  changeAttribute(value: Attribute) {
    this.attributes.update((values) => [...values.filter((a) => a.id !== value.id), value]);
    this.touch();
  }
  private touch() {
    this.dirty.set(true);
    this.validation.set(null);
    this.remember();
  }
  private mergeCategories(items: Category[]) {
    this.categoryCatalog.update((current) => [
      ...new Map(
        [...current, ...items].map((c) => [c.description_category_id + ':' + c.type_id, c]),
      ).values(),
    ]);
  }
  findCategories() {
    const request = ++this.categoryRequest;
    this.categoryLoading.set(true);
    this.api
      .categories(this.categorySearch.value)
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (data) => {
          if (request !== this.categoryRequest) return;
          this.categories.set(data.items);
          this.mergeCategories(data.items);
          this.categoryLoading.set(false);
        },
        error: (error) => {
          if (request !== this.categoryRequest) return;
          this.categoryLoading.set(false);
          this.error.set(errorMessage(error));
        },
      });
  }
  refreshCategories(attributes = false) {
    this.categoryLoading.set(true);
    this.api
      .refreshCategories(
        attributes ? this.categoryId() : undefined,
        attributes ? this.typeId() : undefined,
      )
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: () => {
          if (attributes) this.loadDefinitions(this.categoryId(), this.typeId());
          else this.findCategories();
          this.categoryLoading.set(false);
        },
        error: (error) => {
          this.categoryLoading.set(false);
          this.error.set(errorMessage(error));
        },
      });
  }
  selectCategory(category: Category) {
    const request = ++this.previewCategoryRequest,
      offer = this.offer();
    this.pendingCategory.set(category);
    this.categoryLoading.set(true);
    this.api
      .categoryPreview(
        this.offer(),
        category.description_category_id,
        category.type_id,
        this.attributes(),
      )
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (data) => {
          if (request !== this.previewCategoryRequest || offer !== this.offer()) return;
          this.categoryPreview.set(data);
          this.categoryLoading.set(false);
        },
        error: (error) => {
          if (request !== this.previewCategoryRequest || offer !== this.offer()) return;
          this.categoryLoading.set(false);
          this.error.set(errorMessage(error));
        },
      });
  }
  applyCategory() {
    const preview = this.categoryPreview();
    if (!preview) return;
    if (preview.complex_will_be_removed && !this.discardComplex()) {
      this.error.set(
        'Подтвердите снятие сложных характеристик при смене категории. Исходная версия останется в истории.',
      );
      return;
    }
    this.change('description_category_id', String(preview.category_id));
    this.categoryLabel.set(
      this.pendingCategory()?.path ||
        this.pendingCategory()?.category_name ||
        `Категория ${preview.category_id}`,
    );
    this.change('type_id', String(preview.type_id));
    this.attributes.set(preview.kept);
    this.definitions.set(preview.attributes);
    if (preview.complex_will_be_removed) this.complex.set([]);
    this.categoryConfirmed = true;
    this.categoryPreview.set(null);
    this.pendingCategory.set(null);
    this.sidebarCategory.set(null);
    this.syncSidebar();
    this.touch();
  }
  private loadDefinitions(category: number, type: number) {
    const offer = this.offer();
    this.api
      .attributes(category, type)
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (data) => {
          if (offer === this.offer() && category === this.categoryId() && type === this.typeId())
            this.definitions.set(data.items);
        },
        error: (error) => this.error.set(errorMessage(error)),
      });
  }
  complexDefinitions(id: number) {
    return this.definitions().filter((d) => d.attribute_complex_id === id);
  }
  complexAttribute(group: ComplexGroup, id: number): Attribute | undefined {
    const a = group.attributes.find((a) => a.id === id);
    return a ? { id: a.id, values: a.values } : undefined;
  }
  changeComplex(index: number, complexId: number, value: Attribute) {
    this.complex.update((groups) =>
      groups.map((group, i) =>
        i === index
          ? {
              attributes: [
                ...group.attributes.filter((a) => a.id !== value.id),
                { ...value, complex_id: complexId },
              ],
            }
          : group,
      ),
    );
    this.touch();
  }
  addComplex(id: number) {
    this.complex.update((groups) => [
      ...groups,
      {
        attributes: this.complexDefinitions(id).map((d) => ({
          id: d.attribute_id,
          complex_id: id,
          values: [],
        })),
      },
    ]);
    this.touch();
  }
  removeComplex(index: number) {
    this.complex.update((groups) => groups.filter((_, i) => i !== index));
    this.touch();
  }
  private rawFields(): Record<string, string> {
    return Object.fromEntries(
      Object.entries(this.form.getRawValue()).map(([key, value]) => [key, String(value ?? '')]),
    );
  }
  private changes(): Record<string, unknown> {
    const current = this.rawFields(),
      changes: Record<string, unknown> = {};
    for (const [key, text] of Object.entries(current)) {
      let value: unknown = text.trim() || null;
      if (['description_category_id', 'type_id', 'length', 'width', 'height'].includes(key)) {
        value = text ? Number(text) : null;
        if (value !== null && (!Number.isInteger(value) || Number(value) <= 0))
          throw new Error('Размеры и идентификаторы должны быть положительными целыми числами.');
      }
      if (['price', 'old_price', 'weight'].includes(key) && text) {
        const normalized = text.trim().replace(',', '.');
        if (
          !/^\d+(?:\.\d+)?$/.test(normalized) ||
          !Number.isFinite(Number(normalized)) ||
          (key !== 'old_price' && Number(normalized) <= 0)
        )
          throw new Error('Проверьте цену, вес и размеры.');
        value = normalized;
      }
      const original = this.base?.[key as keyof FullPayload] ?? null;
      if (String(value ?? '') !== String(original ?? '')) changes[key] = value;
    }
    if (JSON.stringify(this.attributes()) !== JSON.stringify(this.base?.attributes || []))
      changes['attributes'] = this.attributes();
    if (JSON.stringify(this.complex()) !== JSON.stringify(this.base?.complex_attributes || []))
      changes['complex_attributes'] = this.complex();
    if (JSON.stringify(this.images()) !== JSON.stringify(this.base?.images || []))
      changes['images'] = this.images();
    if (this.categoryConfirmed) changes['attributes'] = this.attributes();
    return changes;
  }
  currentPayload(): FullPayload {
    return {
      ...(this.base || { offer_id: this.offer(), name: this.title() }),
      ...this.rawFields(),
      description_category_id: this.categoryId() || null,
      type_id: this.typeId() || null,
      images: this.images(),
      attributes: this.attributes(),
      complex_attributes: this.complex(),
    } as FullPayload;
  }
  readonly reviewChanges = computed(() => {
    this.formValues();
    const before: Partial<FullPayload> = this.workspace()?.snapshot || {},
      after = this.currentPayload();
    const labels: Record<string, string> = {
      name: 'Номенклатура',
      description: 'Описание',
      price: 'Цена',
      old_price: 'Цена до скидки',
      vat: 'НДС',
      barcode: 'Штрихкод',
      weight: 'Вес, кг',
      length: 'Длина, мм',
      width: 'Ширина, мм',
      height: 'Высота, мм',
      description_category_id: 'Категория',
      type_id: 'Тип маркетплейса',
      images: 'Фото',
      attributes: 'Характеристики',
      complex_attributes: 'Сложные характеристики',
      color_image: 'Фото образца цвета',
    };
    const attributeText = (values: Attribute[]) =>
      values
        .map(
          (a) =>
            (this.definitions().find((d) => d.attribute_id === a.id)?.name || 'Поле ' + a.id) +
            ': ' +
            a.values
              .map(
                (v) =>
                  v.value?.trim() || (v.dictionary_value_id ? '#' + v.dictionary_value_id : '—'),
              )
              .join(', '),
        )
        .join('; ');
    const display = (key: string, value: unknown) =>
      Array.isArray(value)
        ? key === 'images'
          ? value.length + ' фото'
          : key === 'attributes'
            ? attributeText(value as Attribute[])
            : (value as ComplexGroup[])
                .map((g, i) => 'Группа ' + (i + 1) + ': ' + attributeText(g.attributes))
                .join('; ')
        : value == null || value === ''
          ? '—'
          : String(value);
    return Object.entries(labels).flatMap(([key, label]) => {
      const a = before[key as keyof FullPayload],
        b = after[key as keyof FullPayload];
      const same =
        Array.isArray(a) || Array.isArray(b)
          ? JSON.stringify(a || []) === JSON.stringify(b || [])
          : String(a ?? '') === String(b ?? '');
      return same ? [] : [{ field: key, label, before: display(key, a), after: display(key, b) }];
    });
  });
  save() {
    if (this.busy() || this.uploading() || this.uncertain() || this.conflict() || !this.canManage())
      return;
    let changes: Record<string, unknown>;
    try {
      changes = this.changes();
      if (
        !Object.keys(changes).length &&
        (this.workspace()?.versions.length || !this.workspace()?.local_preview)
      ) {
        this.message.set('Изменений для сохранения нет.');
        return;
      }
    } catch (error) {
      this.error.set(errorMessage(error));
      return;
    }
    const offer = this.offer();
    this.busy.set(true);
    this.error.set('');
    this.remember();
    this.api
      .save(
        this.offer(),
        this.expectedVersion,
        changes,
        this.categoryConfirmed,
        this.discardComplex(),
      )
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (data) => {
          if (offer !== this.offer()) return;
          this.drafts.remove(this.key());
          this.fill(data);
          this.busy.set(false);
          this.message.set('Черновик сохранён в v2.');
        },
        error: (error) => {
          if (offer !== this.offer()) return;
          this.busy.set(false);
          this.error.set(errorMessage(error));
          this.uncertain.set(true);
        },
      });
  }
  checkSaved() {
    this.busy.set(true);
    this.api
      .workspace(this.offer())
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (data) => {
          this.busy.set(false);
          this.uncertain.set(false);
          if (data.version !== this.expectedVersion) {
            let changes: Record<string, unknown> = {};
            try {
              changes = this.changes();
            } catch {}
            const same = Object.entries(changes).every(
              ([key, value]) =>
                JSON.stringify(value) ===
                JSON.stringify(data.working_copy[key as keyof FullPayload]),
            );
            if (same) {
              this.drafts.remove(this.key());
              this.fill(data);
              this.message.set('Сохранение подтверждено сервером.');
            } else {
              this.workspace.set(data);
              this.conflict.set(true);
            }
          } else
            this.message.set(
              'Серверная версия не изменилась. Исправьте ошибку и повторите сохранение.',
            );
        },
        error: (error) => {
          this.busy.set(false);
          this.error.set(errorMessage(error));
        },
      });
  }
  validate() {
    this.api
      .validate(this.offer(), this.currentPayload())
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (result) => {
          this.validation.set(result);
          this.message.set(
            result.ready
              ? 'Обязательные поля заполнены. Отправка в Ozon выключена.'
              : 'Проверьте поля в разделе «Проверка».',
          );
        },
        error: (error) => this.error.set(errorMessage(error)),
      });
  }
  focusIssue(field: string) {
    this.goSection(
      field.startsWith('attribute:') ||
        field.startsWith('complex_attributes') ||
        field === 'attributes' ||
        field === 'description_category_id' ||
        field === 'type_id'
        ? 'attributes'
        : field === 'images'
          ? 'image'
          : 'content',
    );
    setTimeout(
      () =>
        document
          .getElementById(
            field.startsWith('attribute:') ? 'attribute-' + field.split(':')[1] : 'card-' + field,
          )
          ?.focus(),
      0,
    );
  }
  restore(version: number) {
    if (this.dirty() || this.busy() || this.uploading() || !this.canManage()) return;
    this.busy.set(true);
    this.api
      .restore(this.offer(), this.expectedVersion, version)
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (data) => {
          this.fill(data);
          this.busy.set(false);
          this.message.set('Выбранная версия восстановлена новым черновиком.');
        },
        error: (error) => {
          this.busy.set(false);
          this.error.set(errorMessage(error));
        },
      });
  }
  loadMedia() {
    const offer = this.offer();
    this.api
      .media(this.offer())
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (data) => {
          if (offer === this.offer()) this.media.set(data.items);
        },
        error: (error) => this.error.set(errorMessage(error)),
      });
  }
  addImage(url: string) {
    if (this.images().length >= 15) {
      this.error.set('В галерее может быть до 15 фотографий.');
      return;
    }
    if (this.images().includes(url)) return;
    this.images.update((values) => [...values, url]);
    this.touch();
  }
  changeImages(values: string[]) {
    this.images.set(values);
    this.touch();
  }
  appendMedia(item: MediaItem) {
    return (values: MediaItem[]) => [item, ...values.filter((v) => v.id !== item.id)];
  }
  applyAi(result: {
    title?: string;
    description?: string;
    attributes?: Attribute[];
    media?: MediaItem;
  }) {
    if (result.title !== undefined) this.change('name', result.title);
    if (result.description !== undefined) this.change('description', result.description);
    for (const a of result.attributes || []) this.changeAttribute(a);
    if (result.media) {
      this.addImage(result.media.content_url);
      this.loadMedia();
    }
    this.message.set('AI-предложение перенесено в редактор. Проверьте поля и сохраните карточку.');
  }
}
