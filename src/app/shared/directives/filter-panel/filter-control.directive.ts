// filter-control.directive.ts
import { 
  Directive, 
  Input, 
  Output, 
  EventEmitter, 
  OnInit, 
  OnDestroy,
  TemplateRef,
  ViewContainerRef,
  inject,
  effect,
  untracked
} from '@angular/core';
import { FilterConfig } from './infrastructure/models/filter.model';
import { FilterService } from './infrastructure/services/filter.service';


interface FilterControlContext {
  $implicit: {
    config: FilterConfig;
    value: any;
    error: string | null;
    disabled: boolean;
    updateValue: (value: any) => void;
    getValue: () => any;
  };
}

@Directive({
  selector: '[appFilterControl]',
  standalone: false,
  exportAs: 'filterControl'
})
export class FilterControlDirective implements OnInit, OnDestroy {
  @Input('appFilterControl') key!: string;
  @Input('appFilterControlConfig') customConfig?: FilterConfig;
  @Input('appFilterControlValue') initialValue?: any;
  @Output() valueChange = new EventEmitter<any>();
  @Output() errorChange = new EventEmitter<string | null>();

  private filterService = inject(FilterService);
  private templateRef = inject(TemplateRef<any>);
  private viewContainer = inject(ViewContainerRef);

  private context: FilterControlContext = {
    $implicit: {
      config: {} as FilterConfig,
      value: null,
      error: null,
      disabled: false,
      updateValue: this.updateValue.bind(this),
      getValue: this.getValue.bind(this)
    }
  };

  private viewRef: any;
  private destroyEffect: any;

  ngOnInit() {
    const config = this.customConfig || this.filterService.getConfig(this.key);
    if (!config) {
      console.error(`Фильтр с ключом "${this.key}" не найден`);
      return;
    }

    // Устанавливаем начальное значение
    if (this.initialValue !== undefined) {
      this.filterService.updateFilter(this.key, this.initialValue);
    }

    // Обновляем контекст
    this.updateContext();

    // Подписываемся на изменения
    this.destroyEffect = effect(() => {
      const value = this.filterService.getValue(this.key);
      const error = this.filterService.getError(this.key);
      const isDisabled = this.isDisabled(config);
      const currentConfig = this.filterService.getConfig(this.key);

      untracked(() => {
        this.context.$implicit.config = currentConfig || config;
        this.context.$implicit.value = value;
        this.context.$implicit.error = error;
        this.context.$implicit.disabled = isDisabled;
        
        this.render();
        this.valueChange.emit(value);
        this.errorChange.emit(error);
      });
    });
  }

  private updateContext(): void {
    const config = this.customConfig || this.filterService.getConfig(this.key);
    if (!config) return;

    const value = this.filterService.getValue(this.key);
    const error = this.filterService.getError(this.key);
    const isDisabled = this.isDisabled(config);

    this.context.$implicit.config = config;
    this.context.$implicit.value = value;
    this.context.$implicit.error = error;
    this.context.$implicit.disabled = isDisabled;
  }

  private render(): void {
    this.viewContainer.clear();
    this.viewRef = this.viewContainer.createEmbeddedView(this.templateRef, this.context);
  }

  private isDisabled(config: FilterConfig): boolean {
    if (config.disabled) return true;
    
    if (config.dependsOn) {
      const dependsOnArray = Array.isArray(config.dependsOn) ? config.dependsOn : [config.dependsOn];
      for (const dependKey of dependsOnArray) {
        const dependValue = this.filterService.getValue(dependKey);
        if (!dependValue && dependValue !== false && dependValue !== 0) {
          return true;
        }
      }
    }
    return false;
  }

  updateValue(value: any): void {
    this.filterService.updateFilter(this.key, value);
  }

  getValue(): any {
    return this.filterService.getValue(this.key);
  }

  ngOnDestroy() {
    if (this.destroyEffect) {
      this.destroyEffect.destroy();
    }
    if (this.viewRef) {
      this.viewRef.destroy();
    }
  }
}
