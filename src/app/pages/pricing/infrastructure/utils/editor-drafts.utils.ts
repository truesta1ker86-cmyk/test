import { signal } from '@angular/core';

export function tableValues() {
  return signal<Record<string, Record<string, string>>>({});
}
