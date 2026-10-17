import { Component, DestroyRef, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Api, errorMessage } from './core/api';
import { SessionContext } from './core/session-context';
import { LoginPanel } from './account/login-panel';
import { Icon } from './shared/icons-sprite/icons-sprite/icons-sprite.component';
import { TableColumnHover } from './shared/data-table/directives/table-column-hover.directive';
import { ProductHoverPreview } from './shared/product-preview/directives/product-hover-preview.directive';

@Component({
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    Icon,
    LoginPanel,
    TableColumnHover,
    ProductHoverPreview,
  ],
  selector: 'app-root',
  styleUrl: './app.css',
  templateUrl: './app.html',
})
export class App {
  readonly context = inject(SessionContext);
  readonly collapsed = signal(false);
  readonly mobileMenu = signal(false);
  readonly sessionError = signal('');
  private readonly api = inject(Api);
  private readonly destroy = inject(DestroyRef);

  constructor() {
    const storage = (event: StorageEvent) => {
      if (
        (event.key === 'o1c-v2-shop-context-change' ||
          (event.key === 'o1c-shop-context-change' &&
            this.context.session()?.session_scope !== 'v2')) &&
        event.newValue &&
        this.context.session()
      ) {
        this.context.block();
      }
    };
    window.addEventListener('storage', storage);
    this.destroy.onDestroy(() => window.removeEventListener('storage', storage));
    this.loadSession();
  }

  loadSession(): void {
    this.context.status.set('loading');
    this.api
      .session()
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (session) => this.context.accept(session),
        error: (error) => {
          if (this.context.status() === 'signed-out' || this.context.status() === 'changed') return;
          this.sessionError.set(errorMessage(error));
          this.context.status.set('error');
        },
      });
  }

  reload(): void {
    window.location.reload();
  }
}
