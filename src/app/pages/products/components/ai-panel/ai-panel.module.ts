import { NgModule } from '@angular/core';
import { AiPanel } from './ai-panel.component';
import { ReactiveFormsModule } from '@angular/forms';

@NgModule({
  declarations: [AiPanel],
  imports: [ReactiveFormsModule],
  exports: [AiPanel],
})
export class AiPanelModule {}
