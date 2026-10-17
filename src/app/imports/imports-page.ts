import { Component, DestroyRef, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { ProductName } from '../shared/product-name';
import { ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { errorMessage, downloadErrorMessage } from '../core/api';
import { date } from '../core/format';
import { download } from '../workspace/format';
interface Issue {
  level: string;
  sheet: string;
  row?: number;
  field?: string;
  message: string;
  code: string;
}
interface ImportSheet {
  name: string;
  sheet_index: number;
  domain: string;
  row_count: number;
  ignored?: boolean;
  mappings: {
    column_index: number;
    source_header: string;
    target_field: string | null;
    confidence?: number;
    sample_values?: unknown[];
  }[];
  sample_rows: Record<string, unknown>[];
}
interface ImportJob {
  job_id: string;
  filename: string;
  status: string;
  revision: string;
  source_format: string;
  sheets: ImportSheet[];
  validation: { errors: number; warnings: number; issues: Issue[] };
  ai_mapping?: { status: string; charged: boolean };
}
interface ImportHistory {
  job_id: string;
  filename: string;
  status: string;
  rows: number;
  errors: number;
  warnings: number;
  created_at: string;
  applied_at: string | null;
}
interface ImportProfile {
  id: number;
  name: string;
  version: number;
  use_count: number;
  last_used_at: string | null;
}
interface ImportWorkspace {
  items: ImportHistory[];
  total: number;
  profiles: ImportProfile[];
  fields: { name: string; label: string; kind: string }[];
  can_manage: boolean;
}
interface ImportPreview {
  revision: string;
  records_created: number;
  records_updated: number;
  records_unchanged: number;
  changes_truncated: boolean;
  changes: {
    entity: string;
    key: string;
    action: string;
    source_row: number | null;
    fields: Record<string, { old: unknown; new: unknown }>;
  }[];
}
@Component({
  selector: 'app-imports-page',
  imports: [FormsModule, ProductName],
  templateUrl: './imports-page.html',
  styleUrl: '../stocks/stocks-page.css',
})
export class ImportsPage {
  private readonly http = inject(HttpClient);
  private readonly destroy = inject(DestroyRef);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly root = '/v2/api/workspace-v2/imports';
  readonly data = signal<ImportWorkspace | null>(null);
  readonly job = signal<ImportJob | null>(null);
  readonly preview = signal<ImportPreview | null>(null);
  readonly mappingDirty = signal(false);
  readonly busy = signal(false);
  readonly error = signal('');
  readonly notice = signal('');
  readonly tab = signal('upload');
  readonly file = signal<File | null>(null);
  readonly date = date;
  readonly keys = Object.keys;
  readonly statusLabels: Record<string, string> = {
    ready: 'Готов',
    warnings: 'Есть предупреждения',
    blocked: 'Есть ошибки',
    applied: 'Применён',
    duplicate: 'Уже применён',
  };
  acknowledge = false;
  confirmApply = false;
  deleteProfile: number | null = null;
  page = 1;
  constructor() {
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroy)).subscribe((p) => {
      this.tab.set(
        ['upload', 'history', 'profiles'].includes(p.get('tab') || '') ? p.get('tab')! : 'upload',
      );
      this.page = Math.max(1, Number(p.get('page')) || 1);
      const id = p.get('job');
      if (id && id !== this.job()?.job_id) this.open(id);
      this.load();
    });
  }
  navigate(tab = this.tab(), page = 1) {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        tab,
        page: page === 1 ? null : page,
        job: tab === 'upload' ? this.job()?.job_id : null,
      },
    });
  }
  load() {
    this.http
      .get<ImportWorkspace>(this.root + '/workspace', {
        params: { limit: 25, offset: (this.page - 1) * 25 },
      })
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({ next: (r) => this.data.set(r), error: (e) => this.error.set(errorMessage(e)) });
  }
  choose(event: Event) {
    const f = (event.target as HTMLInputElement).files?.[0];
    if (f && f.size > 20 * 1024 * 1024) {
      this.error.set('Файл превышает лимит 20 МБ.');
      return;
    }
    this.file.set(f || null);
  }
  upload() {
    const f = this.file();
    if (!f || this.busy()) return;
    this.busy.set(true);
    this.error.set('');
    this.http
      .post<ImportJob>(this.root + '/upload', f, {
        params: { filename: f.name },
        headers: { 'Content-Type': 'application/octet-stream' },
      })
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (r) => {
          this.busy.set(false);
          this.accept(r);
          this.file.set(null);
          this.navigate('upload');
          this.load();
        },
        error: (e) => {
          this.busy.set(false);
          this.error.set(errorMessage(e));
        },
      });
  }
  open(id: string) {
    this.error.set('');
    this.preview.set(null);
    this.http
      .get<ImportJob>(this.root + '/job', { params: { job_id: id } })
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (r) => {
          this.accept(r);
          this.navigate('upload');
        },
        error: (e) => this.error.set(errorMessage(e)),
      });
  }
  private accept(job: ImportJob) {
    this.mappingDirty.set(false);
    this.job.set(job);
    this.preview.set(null);
    this.acknowledge = false;
    this.confirmApply = false;
  }
  saveMapping() {
    const job = this.job();
    if (!job) return;
    this.post<ImportJob>(
      '/mapping',
      {
        job_id: job.job_id,
        expected_revision: job.revision,
        mappings: job.sheets.flatMap((s, i) =>
          s.mappings.map((m) => ({
            sheet_index: s.sheet_index ?? i,
            column_index: m.column_index,
            target_field: m.target_field || null,
          })),
        ),
      },
      (r) => {
        this.accept(r);
        this.notice.set('Сопоставление сохранено и проверено.');
      },
    );
  }
  validate() {
    const j = this.job();
    if (j) this.post<ImportJob>('/validate', { job_id: j.job_id }, (r) => this.accept(r));
  }
  reanalyze() {
    const j = this.job();
    if (j) this.post<ImportJob>('/reanalyze', { job_id: j.job_id }, (r) => this.accept(r));
  }
  check() {
    if (this.mappingDirty()) return;
    const j = this.job();
    if (j)
      this.post<ImportPreview>('/preview', { job_id: j.job_id }, (r) => {
        this.preview.set(r);
        this.confirmApply = false;
      });
  }
  apply() {
    const job = this.job(),
      preview = this.preview();
    if (!job || !preview || !this.confirmApply) return;
    this.post<{ affected: number; status: string }>(
      '/apply',
      {
        job_id: job.job_id,
        expected_revision: preview.revision,
        confirm: true,
        acknowledge_warnings: this.acknowledge,
      },
      (r) => {
        this.notice.set(
          (r.status === 'duplicate'
            ? 'Импорт уже применён.'
            : 'Применено записей: ' + r.affected + '.') + ' Данные сохранены в копии.',
        );
        this.open(job.job_id);
        this.load();
      },
    );
  }
  issues() {
    const j = this.job();
    if (j)
      this.http
        .get(this.root + '/issues', { params: { job_id: j.job_id }, responseType: 'blob' })
        .pipe(takeUntilDestroyed(this.destroy))
        .subscribe({
          next: (b) => download(b, 'import-issues.csv'),
          error: async (e) => this.error.set(await downloadErrorMessage(e)),
        });
  }
  removeProfile(id: number) {
    this.post('/profile/delete', { profile_id: id }, () => {
      this.deleteProfile = null;
      this.notice.set('Профиль удалён из копии.');
      this.load();
    });
  }
  domain(key: string) {
    return (
      (
        {
          costs: 'Себестоимость',
          stocks: 'Остатки',
          products: 'Каталог',
          pricing: 'Расчёт цен',
          mixed: 'Данные нескольких разделов',
          reference: 'Справочники',
        } as Record<string, string>
      )[key] || 'Табличные данные'
    );
  }
  entity(key: string) {
    return (
      (
        {
          pricing_config: 'Параметры расчёта',
          cost_supplier: 'Цена поставщика',
          cost_batch: 'Средняя по партиям',
          quant: 'Упаковка',
          product: 'Товар',
          stock: 'Остаток 1С',
          ozon_stock: 'Остаток Ozon',
          finance_period_cost: 'Себестоимость за месяц',
        } as Record<string, string>
      )[key] || 'Запись'
    );
  }
  label(key: string) {
    const labels: Record<string, string> = {
      purchase: 'Закупочная цена',
      dealer: 'Дилерская цена',
      cost: 'Себестоимость',
      sku_1c: 'Артикул 1С',
      description_category_id: 'ID категории Ozon',
      type_id: 'ID типа Ozon',
    };
    const name = labels[key] || this.data()?.fields.find((f) => f.name === key)?.label || key;
    return name.charAt(0).toLocaleUpperCase() + name.slice(1);
  }
  display(value: unknown): string {
    if (value === null || value === undefined || value === '') return '—';
    if (Array.isArray(value)) return value.map((v) => this.display(v)).join(', ');
    if (typeof value === 'object')
      return Object.values(value as Record<string, unknown>)
        .map((v) => this.display(v))
        .join(' · ');
    return String(value);
  }
  private post<T>(path: string, body: unknown, done: (r: T) => void) {
    if (this.busy()) return;
    this.busy.set(true);
    this.error.set('');
    this.http
      .post<T>(this.root + path, body)
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (r) => {
          this.busy.set(false);
          done(r);
        },
        error: (e) => {
          this.busy.set(false);
          this.error.set(errorMessage(e));
        },
      });
  }
}
