import { Component, input } from '@angular/core';

import { iconPaths, IconName } from '../infrastructure/constants/icon-paths';

@Component({
  selector: 'app-icon',
  templateUrl: './icons-sprite.component.html',
  styleUrl: './icons-sprite.component.css',
})
export class Icon {
  readonly name = input<IconName>('arrow');
  path(): string {
    return iconPaths[this.name()];
  }
}
