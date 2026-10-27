import { FilterValuesModule } from '../../../../shared/filtering/filter-values.module';
import { FilterPanelModule } from '../../../../shared/directives/filter-panel/filter-panel.module';
import { NgModule } from '@angular/core';
import { FinancePage } from './finance-page.component';
import { DataTableModule } from '../../../../shared/data-table/data-table.module';
import { FormsModule } from '@angular/forms';
import { ReportTableModule } from '../report-table/report-table.module';
import { ModalFocusModule } from '../../../../shared/directives/modal-focus/modal-focus.module';
import { ProfitSummaryModule } from '../profit-summary/profit-summary.module';
import { IconModule } from '../../../../shared/icons-sprite/icon/icon.module';
import { FinanceCellSelectionModule } from '../../directives/finance-cell-selection/finance-cell-selection.module';
import { PeriodPickerModule } from '../../../../shared/period-picker/period-picker.module';

@NgModule({
  declarations: [FinancePage],
  imports: [
    FilterValuesModule,
    FilterPanelModule,
    DataTableModule,
    FormsModule,
    ReportTableModule,
    ModalFocusModule,
    ProfitSummaryModule,
    IconModule,
    FinanceCellSelectionModule,
    PeriodPickerModule,
  ],
  exports: [FinancePage],
})
export class FinancePageModule {}
