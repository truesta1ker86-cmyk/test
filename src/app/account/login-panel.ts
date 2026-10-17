import { Component, DestroyRef, inject, output, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SellerSession } from '../core/contracts';
import { errorMessage } from '../core/api';
@Component({
  selector: 'app-login-panel',
  imports: [FormsModule],
  template: `<form (ngSubmit)="login()">
    <label
      >Ключ доступа<input
        type="password"
        name="token"
        [(ngModel)]="token"
        autocomplete="current-password"
        required
        minlength="16"
    /></label>
    @if (options()?.consent_required) {
      <label class="check"
        ><input type="checkbox" name="terms" [(ngModel)]="terms" required /><span
          >Принимаю
          <a href="/legal/terms" target="_blank" rel="noopener">условия использования</a></span
        ></label
      ><label class="check"
        ><input type="checkbox" name="consent" [(ngModel)]="consent" required /><span
          >Даю
          <a href="/legal/consent" target="_blank" rel="noopener"
            >согласие на обработку персональных данных</a
          >
          и ознакомлен с
          <a href="/legal/privacy" target="_blank" rel="noopener">политикой обработки</a></span
        ></label
      >
    }
    @if (error()) {
      <p role="alert" class="error">{{ error() }}</p>
    }
    <button class="button primary" type="submit" [disabled]="busy() || !options()">
      {{ busy() ? 'Входим…' : 'Войти в v2' }}
    </button>
  </form>`,
  styles: `
    :host {
      display: block;
      text-align: left;
      width: min(380px, 100%);
      margin: 20px auto;
    }
    form {
      display: grid;
      gap: 16px;
    }
    label {
      display: flex;
      flex-direction: column;
      gap: 6px;
      font-size: 13px;
    }
    .check {
      flex-direction: row;
      font-size: 12px;
      align-items: flex-start;
      line-height: 1.6;
    }
    .check input {
      width: auto;
      margin-top: 4px;
    }
    .error {
      font-size: 12px;
      color: var(--red);
    }
    a {
      color: var(--brand);
    }
  `,
})
export class LoginPanel {
  private readonly http = inject(HttpClient);
  private readonly destroy = inject(DestroyRef);
  readonly accepted = output<SellerSession>();
  readonly options = signal<{ legal_document_version: string; consent_required: boolean } | null>(
    null,
  );
  readonly busy = signal(false);
  readonly error = signal('');
  token = '';
  terms = false;
  consent = false;
  constructor() {
    this.http
      .get<{ legal_document_version: string; consent_required: boolean }>('/v2/api/auth/options')
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (r) => this.options.set(r),
        error: (e) => this.error.set(errorMessage(e)),
      });
  }
  login() {
    if (this.busy()) return;
    this.busy.set(true);
    this.error.set('');
    this.http
      .post<SellerSession>('/v2/api/auth/login', {
        token: this.token,
        accept_legal_terms: this.terms,
        accept_personal_data_processing: this.consent,
        legal_document_version: this.options()?.legal_document_version,
      })
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (r) => {
          this.token = '';
          this.busy.set(false);
          this.accepted.emit(r);
        },
        error: (e) => {
          this.busy.set(false);
          this.error.set(errorMessage(e));
        },
      });
  }
}
