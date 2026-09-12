import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';


export type PreloaderSize = 'sm' | 'md' | 'lg';
export type PreloaderVariant = 'inline' | 'overlay' | 'block';

@Component({
  selector: 'app-preloader',
  standalone: false,
  templateUrl: './preloader.component.html',
  styleUrl: './preloader.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class.preloader--inline]': 'variant() === "inline"',
    '[class.preloader--overlay]': 'variant() === "overlay"',
    '[class.preloader--block]': 'variant() === "block"',
    '[class.preloader--sm]': 'size() === "sm"',
    '[class.preloader--lg]': 'size() === "lg"',
  },
})
export class PreloaderComponent {
  /** Видим ли прелоадер. */
  readonly visible = input<boolean>(true);

  /** Режим: inline (в потоке) / overlay (поверх) / block (по центру). */
  readonly variant = input<PreloaderVariant>('inline');

  /** Размер спиннера. */
  readonly size = input<PreloaderSize>('md');

  /** Текст рядом со спиннером. */
  readonly label = input<string>('');

  /** Прозрачность фона для overlay. */
  readonly overlayOpacity = input<number>(0.6);

  /** Размытие фона для overlay. */
  readonly backdropBlur = input<boolean>(true);

  readonly strokeWidth = computed(() => {
    switch (this.size()) {
      case 'sm':
        return '4';
      case 'lg':
        return '3';
      default:
        return '4';
    }
  });
}
