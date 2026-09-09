import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'filterVisible',
  standalone: false,
})
export class FilterVisiblePipe implements PipeTransform {
  transform(items: any[]): any[] {
    if (!items) return [];
    return items.filter((item) => item.visible !== false);
  }
}
