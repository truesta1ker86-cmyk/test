import {
  ACCOUNT_PAGE_API_ROOT,
  ACCOUNT_PAGE_TABLE_COLUMNS1,
  ACCOUNT_PAGE_TABLE_COLUMNS2,
  ACCOUNT_PAGE_TABLE_COLUMNS3,
  ACCOUNT_PAGE_TABLE_COLUMNS4,
  ACCOUNT_PAGE_TABLE_COLUMNS5,
  ACCOUNT_PAGE_ROLES,
} from './infrastructure/constants/account-page.constants';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import type { DataTableColumn } from '../../../../shared/data-table/infrastructure/interfaces/data-table-config.interfaces';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SessionContext } from '../../../../core/infrastructure/services/session-context.service';
import type { SellerSession } from '../../../../core/infrastructure/interfaces/contracts.interfaces';
import { errorMessage } from '../../../../core/infrastructure/utils/api.utils';
import { date } from '../../../../core/infrastructure/utils/format.utils';
import { currency } from '../../../orders/infrastructure/utils/format.utils';
import type {
  Account,
  Member,
  PullPreview,
  Shop,
} from '../../infrastructure/interfaces/contracts.interfaces';

@Component({
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush,

  selector: 'app-account-page',

  templateUrl: './account-page.component.html',
  styleUrls: [
    '../../../stocks/components/stocks-page/stocks-page.component.css',
    './account-page.component.css',
  ],
})
export class AccountPage {
  tableColumns1(): DataTableColumn[] {
    return ACCOUNT_PAGE_TABLE_COLUMNS1;
  }
  tableColumns2(): DataTableColumn[] {
    return ACCOUNT_PAGE_TABLE_COLUMNS2;
  }
  tableColumns3(): DataTableColumn[] {
    return ACCOUNT_PAGE_TABLE_COLUMNS3;
  }
  tableColumns4(): DataTableColumn[] {
    return ACCOUNT_PAGE_TABLE_COLUMNS4;
  }
  tableColumns5(): DataTableColumn[] {
    return ACCOUNT_PAGE_TABLE_COLUMNS5;
  }

  private readonly http = inject(HttpClient);
  private readonly destroy = inject(DestroyRef);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly context = inject(SessionContext);
  private readonly root = ACCOUNT_PAGE_API_ROOT;
  readonly data = signal<Account | null>(null);
  readonly busy = signal(false);
  readonly error = signal('');
  readonly notice = signal('');
  readonly tab = signal('profile');
  readonly showDisabledShops = signal(false);
  readonly hiddenShopCount = computed(
    () => this.data()?.shops.filter((shop) => !shop.is_active && !shop.is_current).length || 0,
  );
  readonly visibleShops = computed(() =>
    (this.data()?.shops || []).filter(
      (shop) => this.showDisabledShops() || shop.is_active || shop.is_current,
    ),
  );
  readonly editor = signal<'create' | 'credentials' | 'performance' | 'rename' | null>(null);
  readonly editingShop = signal<Shop | null>(null);
  readonly newToken = signal('');
  readonly pull = signal<PullPreview | null>(null);
  readonly confirmAction = signal<{ label: string; path: string; body: unknown } | null>(null);
  readonly date = date;
  readonly currency = currency;
  readonly roles: Record<string, string> = ACCOUNT_PAGE_ROLES;
  name = '';
  clientId = '';
  apiKey = '';
  performanceId = '';
  performanceSecret = '';
  memberName = '';
  memberRole = 'viewer';
  aiKey = '';
  onecUrl = '';
  onecUser = '';
  onecPassword = '';
  allowHttp = false;
  confirmPull = false;
  topupAmount = 1000;
  topupNote = '';
  constructor() {
    this.route.queryParamMap
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe((p) =>
        this.tab.set(
          ['profile', 'shops', 'team', 'ai', 'billing', 'onec'].includes(p.get('tab') || '')
            ? p.get('tab')!
            : 'profile',
        ),
      );
    this.load();
  }
  closeDialog() {
    if (!this.busy()) {
      this.editor.set(null);
      this.confirmAction.set(null);
    }
  }
  navigate(tab: string) {
    this.newToken.set('');
    void this.router.navigate([], { relativeTo: this.route, queryParams: { tab } });
  }
  load() {
    this.error.set('');
    this.http
      .get<Account>(this.root + '/workspace')
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (r) => {
          this.data.set(r);
          const current = this.context.session();
          if (current?.tenant_id === r.session.tenant_id && current.name !== r.session.name)
            this.context.accept({ ...current, name: r.session.name });
          this.onecUrl = r.onec?.base_url || '';
          this.onecUser = r.onec?.username || '';
        },
        error: (e) => this.error.set(errorMessage(e)),
      });
  }
  edit(mode: 'create' | 'credentials' | 'performance' | 'rename', shop?: Shop) {
    this.error.set('');
    this.editingShop.set(shop || null);
    this.editor.set(mode);
    this.name = shop?.name || '';
    this.clientId = shop?.ozon_client_id || '';
    this.apiKey = '';
    this.performanceId = '';
    this.performanceSecret = '';
  }
  saveShop() {
    const shop = this.editingShop();
    const mode = this.editor();
    let body: unknown;
    if (mode === 'create')
      body = {
        name: this.name,
        ozon_client_id: this.clientId,
        ozon_api_key: this.apiKey,
        confirm: true,
      };
    else if (mode === 'rename') body = { tenant_id: shop?.tenant_id, name: this.name };
    else if (mode === 'performance')
      body = {
        tenant_id: shop?.tenant_id,
        performance_client_id: this.performanceId,
        performance_client_secret: this.performanceSecret,
        confirm: true,
      };
    else
      body = {
        tenant_id: shop?.tenant_id,
        ozon_client_id: this.clientId,
        ozon_api_key: this.apiKey,
        confirm: true,
      };
    const path =
      mode === 'create'
        ? '/shop/create'
        : mode === 'rename'
          ? '/shop/rename'
          : mode === 'performance'
            ? '/shop/performance'
            : '/shop/credentials';
    this.post<{
      saved: boolean;
      message?: string;
      checks?: { name: string; ok: boolean; error?: string | null }[];
    }>(path, body, (r) => {
      this.notice.set(
        (r.message || 'Сохранено в копии.') +
          (r.checks?.length
            ? ' ' +
              r.checks
                .map(
                  (c) => c.name + ': ' + (c.ok ? 'проверено' : c.error || 'проверка не пройдена'),
                )
                .join('; ')
            : ''),
      );
      this.apiKey = '';
      this.performanceSecret = '';
      if (r.saved) this.editor.set(null);
      this.load();
    });
  }
  activate(shop: Shop) {
    this.post<SellerSession>('/shop/activate', { tenant_id: shop.tenant_id }, (r) => {
      this.context.accept(r);
      this.broadcast();
      window.location.assign('/v2/account?tab=profile');
    });
  }
  ask(label: string, path: string, body: unknown) {
    this.error.set('');
    this.confirmAction.set({ label, path, body });
  }
  confirm() {
    const a = this.confirmAction();
    if (a)
      this.post(a.path, a.body, () => {
        this.confirmAction.set(null);
        this.notice.set('Изменение сохранено в копии.');
        this.load();
      });
  }
  createMember() {
    this.post<Member & { token: string }>(
      '/team/create',
      { name: this.memberName, role: this.memberRole },
      (r) => {
        this.newToken.set(r.token);
        this.memberName = '';
        this.notice.set('Доступ создан только в v2. Сохраните ключ: повторно он не показывается.');
        this.load();
      },
    );
  }
  saveAi() {
    this.post('/ai/key', { apiKey: this.aiKey, confirm: true }, () => {
      this.aiKey = '';
      this.notice.set('AI-ключ сохранён в копии.');
      this.load();
    });
  }
  testAi() {
    this.post<{ message: string }>('/ai/test', {}, (r) => {
      this.notice.set(r.message);
      this.load();
    });
  }
  saveOnec() {
    this.post<{ message: string }>(
      '/onec/save',
      {
        base_url: this.onecUrl,
        username: this.onecUser,
        password: this.onecPassword,
        allow_insecure_http: this.allowHttp,
        confirm: true,
      },
      (r) => {
        this.onecPassword = '';
        this.notice.set(r.message);
        this.load();
      },
    );
  }
  testOnec() {
    this.post<{ message: string }>('/onec/test', { confirm: true }, (r) => {
      this.notice.set(r.message);
      this.load();
    });
  }
  previewOnec() {
    this.post<PullPreview>('/onec/preview', { confirm: true }, (r) => {
      this.pull.set(r);
      this.confirmPull = false;
    });
  }
  importOnec() {
    if (this.confirmPull)
      this.post<{ stocks_accepted: number; costs_accepted: number }>(
        '/onec/import',
        { confirm: true },
        (r) => {
          this.notice.set(
            'В копию загружено остатков: ' + r.stocks_accepted + ', цен 1С: ' + r.costs_accepted,
          );
          this.pull.set(null);
          this.load();
        },
      );
  }
  topup() {
    this.post<{ message: string }>(
      '/billing/topup',
      { amount_rub: this.topupAmount, note: this.topupNote || null },
      (r) => {
        this.notice.set(r.message);
        this.topupNote = '';
        this.load();
      },
    );
  }
  logout() {
    this.http
      .post('/v2/api/auth/logout', {})
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: () => {
          this.context.signOut();
          this.broadcast();
          window.location.assign('/v2/overview');
        },
        error: (e) => this.error.set(errorMessage(e)),
      });
  }
  private broadcast() {
    try {
      localStorage.setItem('o1c-v2-shop-context-change', String(Date.now()));
    } catch {}
  }
  private post<T>(path: string, body: unknown, done: (r: T) => void) {
    if (this.busy()) return;
    this.busy.set(true);
    this.error.set('');
    this.notice.set('');
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
