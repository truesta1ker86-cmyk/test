import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

@Component({
  selector: 'app-error-state',
  standalone: false,
  templateUrl: './error-state.component.html',
  styleUrl: './error-state.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ErrorStateComponent {
  /** Заголовок. */
  readonly title = input<string>('Не удалось загрузить данные');

  /** Текст ошибки. */
  readonly message = input<string>('');

  /** Текст кнопки (пусто — не показывать). */
  readonly retryLabel = input<string>('Повторить');

  /** Иконка (имя из SVG-спрайта). */
  readonly icon = input<string>('i-alert');

  /** Компактный режим. */
  readonly compact = input<boolean>(false);

  /** Клик «Повторить». */
  readonly retry = output<void>();
}
