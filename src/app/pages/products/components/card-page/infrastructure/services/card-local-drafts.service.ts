import { Injectable } from '@angular/core';
import { LocalDraft } from '../interfaces/card-page.interfaces';

@Injectable()
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
