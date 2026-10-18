import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { iconPaths } from '../infrastructure/constants/icon-paths';
import type { IconName } from '../infrastructure/types/icon-paths.types';

@Component({
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush,

  selector: 'app-icon',
  templateUrl: './icon.component.html',
  styleUrl: './icon.component.css',
})
export class Icon {
  readonly name = input<IconName>('arrow');
  path(): string {
    return iconPaths[this.name()];
  }
}
