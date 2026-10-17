import { Component, DestroyRef, computed, inject, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Onec } from '../account/contracts';
import { CatalogApi } from './api';
import { errorMessage } from '../core/api';
import { Icon } from '../shared/icons-sprite/icons-sprite/icons-sprite.component';

@Component({
  selector: 'app-mapping-connection',
  imports: [FormsModule, Icon],
  templateUrl: './mapping-connection.html',
  styleUrl: './mapping-connection.css',
})
export class MappingConnection {
  private http = inject(HttpClient);
  private api = inject(CatalogApi);
  private destroy = inject(DestroyRef);
  readonly data = signal<{ onec: Onec; local_preview?: boolean; is_owner: boolean } | null>(null);
  readonly busy = signal(false);
  readonly error = signal('');
  readonly notice = signal('');
  readonly checked = signal(false);
  readonly refreshed = output<void>();
  readonly editable = computed(() => !!this.data()?.local_preview && !!this.data()?.is_owner);
  url = '';
  user = '';
  password = '';
  allowHttp = false;
  constructor() {
    this.load();
    this.destroy.onDestroy(() => {
      this.password = '';
    });
  }
  load() {
    this.http
      .get<{ onec: Onec; local_preview?: boolean; is_owner: boolean }>(
        '/v2/api/workspace-v2/account/workspace',
      )
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (r) => {
          this.data.set(r);
          this.url = r.onec.base_url || '';
          this.user = r.onec.username || '';
          this.allowHttp = !!r.onec.configured && !r.onec.secure_transport;
        },
        error: (e) => this.error.set(errorMessage(e)),
      });
  }
  save() {
    if (!this.editable() || this.busy()) return;
    try {
      const parsed = new URL(this.url.trim());
      if (!['https:', 'http:'].includes(parsed.protocol) || parsed.username || parsed.password)
        throw new Error('Укажите адрес публикации 1С без логина и пароля в URL.');
      if (parsed.protocol === 'http:' && !this.allowHttp)
        throw new Error('Для HTTP отметьте разрешение ниже.');
      if (!this.user.trim()) throw new Error('Укажите пользователя 1С.');
    } catch (e) {
      this.error.set(
        e instanceof TypeError ? 'Укажите полный адрес публикации 1С.' : errorMessage(e),
      );
      return;
    }
    // Local fixture remembers only the address and user. Never send the entered password.
    this.post('save', {
      base_url: this.url.trim(),
      username: this.user.trim(),
      allow_insecure_http: this.allowHttp,
      confirm: true,
    });
  }
  test() {
    if (this.data()?.onec.configured) this.post('test', { confirm: true });
  }
  disconnect() {
    if (this.data()?.onec.configured) this.post('delete', { confirm: true });
  }
  private post(action: string, body: Record<string, unknown>) {
    if (!this.editable() || this.busy()) return;
    this.busy.set(true);
    this.error.set('');
    this.http
      .post<{ message: string }>('/v2/api/workspace-v2/account/onec/' + action, body)
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (r) => {
          this.password = '';
          this.busy.set(false);
          this.notice.set(r.message);
          this.load();
        },
        error: (e) => {
          this.password = '';
          this.busy.set(false);
          this.error.set(errorMessage(e));
        },
      });
  }
  snapshot(checkOnly = false) {
    if (this.busy() || !this.data()?.local_preview) return;
    this.busy.set(true);
    this.error.set('');
    this.api
      .mappingSnapshot()
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (r) => {
          this.busy.set(false);
          this.checked.set(true);
          this.notice.set(
            `${checkOnly ? 'Проверено' : 'Перечитано'} записей локального снимка: ${r.items.length}. Запросов к 1С не было.`,
          );
          this.refreshed.emit();
        },
        error: (e) => {
          this.busy.set(false);
          this.error.set(errorMessage(e));
        },
      });
  }
  async pastePassword() {
    if (!this.editable()) return;
    try {
      this.password = await navigator.clipboard.readText();
    } catch {
      this.error.set('Вставьте пароль обычной командой ⌘V / Ctrl+V в поле.');
    }
  }
}
