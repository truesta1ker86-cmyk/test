import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Api } from './core/infrastructure/services/api.service';
import { errorMessage } from './core/infrastructure/utils/api.utils';
import { SessionContext } from './core/infrastructure/services/session-context.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,

  standalone: false,
  selector: 'app-root',
  styleUrl: './app.component.scss',
  templateUrl: './app.component.html',
})
export class AppComponent {
  readonly context = inject(SessionContext);
  readonly sessionError = signal('');
  private readonly api = inject(Api);
  private readonly destroy = inject(DestroyRef);

  constructor() {
    // StorageEvent.key identifies a cross-tab shop notification, not a keyboard key.
    const onShopContextStorage = (event: StorageEvent) => {
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
    window.addEventListener('storage', onShopContextStorage);
    this.destroy.onDestroy(() => window.removeEventListener('storage', onShopContextStorage));
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
