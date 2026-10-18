import { computed, Injectable, signal } from '@angular/core';
import { SellerSession } from '../interfaces/contracts.interfaces';

@Injectable({ providedIn: 'root' })
export class SessionContext {
  readonly session = signal<SellerSession | null>(null);
  readonly databaseCopy = computed(() => this.session()?.data_mode === 'sandbox_db');
  readonly status = signal<'loading' | 'ready' | 'signed-out' | 'changed' | 'error'>('loading');
  generation = 0;

  accept(session: SellerSession): void {
    this.generation += 1;
    this.session.set(session);
    this.status.set('ready');
  }

  block(): void {
    this.generation += 1;
    this.session.set(null);
    this.status.set('changed');
  }

  signOut(): void {
    this.generation += 1;
    this.session.set(null);
    this.status.set('signed-out');
  }
}
