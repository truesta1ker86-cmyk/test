import {
  ChangeDetectionStrategy,
  Component,
  effect,
  input,
  signal,
  untracked,
} from '@angular/core';

@Component({
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush,

  selector: 'app-animated-count',
  template: '{{ displayed().toLocaleString("ru-RU") }}',
})
export class AnimatedCount {
  readonly value = input(0);
  readonly displayed = signal(0);
  constructor() {
    effect((onCleanup) => {
      const target = this.value(),
        from = untracked(this.displayed);
      if (
        typeof matchMedia === 'undefined' ||
        matchMedia('(prefers-reduced-motion: reduce)').matches
      ) {
        this.displayed.set(target);
        return;
      }
      const start = performance.now();
      let frame = 0;
      const tick = (now: number) => {
        const progress = Math.min((now - start) / 400, 1);
        this.displayed.set(Math.round(from + (target - from) * (1 - (1 - progress) ** 3)));
        if (progress < 1) frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
      onCleanup(() => cancelAnimationFrame(frame));
    });
  }
}
