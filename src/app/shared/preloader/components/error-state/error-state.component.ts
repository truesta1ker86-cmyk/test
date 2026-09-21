import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

@Component({
  selector: 'app-error-state',
  standalone: false,
  templateUrl: './error-state.component.html',
  styleUrl: './error-state.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ErrorStateComponent {
  readonly title = input<string>('Не удалось загрузить данные');
  readonly message = input<string>('');
  readonly retryLabel = input<string>('Повторить');
  readonly icon = input<string>('i-alert');
  readonly compact = input<boolean>(false);

  readonly retry = output<void>();
}
