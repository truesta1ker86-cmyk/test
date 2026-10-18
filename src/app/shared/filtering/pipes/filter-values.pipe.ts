import { Pipe, PipeTransform } from '@angular/core';

/** Converts the API's encoded facet values; Angular caches unchanged pipe inputs. */
@Pipe({ name: 'filterValues', standalone: false, pure: true })
export class FilterValuesPipe implements PipeTransform {
  transform(value: string | string[] | null | undefined, key?: string): string[] {
    if (Array.isArray(value)) return value;
    if (!value) return [];
    try {
      const parsed: unknown = JSON.parse(value);
      const selected =
        key && parsed && typeof parsed === 'object' && !Array.isArray(parsed)
          ? (parsed as Record<string, unknown>)[key]
          : parsed;
      if (Array.isArray(selected) && selected.every((item) => typeof item === 'string'))
        return selected;
      return key ? [] : [value];
    } catch {
      return key ? [] : [value];
    }
  }
}
