import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { FormControl } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CardsApi } from '../../infrastructure/services/cards-api.service';
import type { MediaItem } from '../../infrastructure/interfaces/contracts.interfaces';
import { errorMessage } from '../../../../core/infrastructure/utils/api.utils';

@Component({
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush,

  selector: 'app-card-gallery',

  templateUrl: './gallery.component.html',
  styleUrl: './gallery.component.css',
})
export class Gallery {
  readonly localPreview = input(false);
  previewable(url: string) {
    return !this.localPreview() || url.startsWith('data:image/') || url.startsWith('/v2/');
  }
  readonly offer = input.required<string>();
  readonly title = input.required<string>();
  readonly images = input.required<string[]>();
  readonly media = input.required<MediaItem[]>();
  readonly changed = output<string[]>();
  readonly uploaded = output<MediaItem>();
  readonly failed = output<string>();
  readonly uploadingChanged = output<boolean>();
  readonly uploading = signal(false);
  readonly imageUrl = new FormControl('', { nonNullable: true });
  private readonly api = inject(CardsApi);
  private readonly destroy = inject(DestroyRef);
  add(url: string) {
    if (this.images().length >= 15) {
      this.failed.emit('В галерее может быть до 15 фото.');
      return;
    }
    if (!this.images().includes(url)) this.changed.emit([...this.images(), url]);
  }
  addUrl() {
    try {
      const url = new URL(this.imageUrl.value.trim());
      if (url.protocol !== 'https:' || url.username || url.password) throw new Error();
      this.add(url.href);
      this.imageUrl.setValue('');
    } catch {
      this.failed.emit('Укажите HTTPS-ссылку на фотографию.');
    }
  }
  move(index: number, delta: number) {
    const values = [...this.images()],
      next = index + delta;
    if (next < 0 || next >= values.length) return;
    [values[index], values[next]] = [values[next], values[index]];
    this.changed.emit(values);
  }
  makePrimary(index: number) {
    if (index <= 0 || index >= this.images().length) return;
    const next = [...this.images()],
      [image] = next.splice(index, 1);
    this.changed.emit([image, ...next]);
  }
  remove(index: number) {
    this.changed.emit(this.images().filter((_, i) => i !== index));
  }
  upload(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    if (
      !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) ||
      file.size > 8 * 1024 * 1024
    ) {
      this.failed.emit('Выберите JPEG, PNG или WebP не больше 8 МБ.');
      return;
    }
    this.setUploading(true);
    const reader = new FileReader();
    reader.onerror = () => {
      if (this.destroy.destroyed) return;
      this.setUploading(false);
      this.failed.emit('Не удалось прочитать фотографию.');
    };
    reader.onload = () => {
      if (this.destroy.destroyed) return;
      this.api
        .upload(this.offer(), this.title(), String(reader.result))
        .pipe(takeUntilDestroyed(this.destroy))
        .subscribe({
          next: (item) => {
            this.setUploading(false);
            this.uploaded.emit(item);
            this.add(item.content_url);
          },
          error: (error) => {
            this.setUploading(false);
            this.failed.emit(errorMessage(error));
          },
        });
    };
    reader.readAsDataURL(file);
    (event.target as HTMLInputElement).value = '';
  }
  private setUploading(value: boolean) {
    this.uploading.set(value);
    this.uploadingChanged.emit(value);
  }
}
