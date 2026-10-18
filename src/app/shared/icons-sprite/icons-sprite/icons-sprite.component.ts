import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,

  selector: 'app-icons-sprite',
  standalone: false,
  styleUrl: './icons-sprite.component.scss',
  templateUrl: './icons-sprite.component.html',
})
export class IconsSpriteComponent {}
