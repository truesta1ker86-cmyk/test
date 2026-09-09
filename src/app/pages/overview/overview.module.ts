import { NgModule } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { RouterModule } from '@angular/router';


import { ChartModule } from 'primeng/chart'; 
import { SelectModule } from 'primeng/select';
import { OverviewComponent } from './components/overview/overview.component';
import { OverviewStatsComponent } from './components/overview/overview-stats/overview-stats.component';
import { OverviewChartsComponent } from './components/overview/overview-charts/overview-charts.component';
import { FormsModule } from '@angular/forms';
import { OverviewReportsComponent } from './components/overview/overview-reports/overview-reports.component';
import { OverviewOrdersComponent } from './components/overview/overview-orders/overview-orders.component';
import { OverviewAuditComponent } from './components/overview/overview-audit/overview-audit.component';
import { OverviewActionsComponent } from './components/overview/overview-actions/overview-actions.component';
import { OverviewPreflightComponent } from './components/overview/overview-preflight/overview-preflight.component';


@NgModule({
  declarations: [
    OverviewComponent,
    OverviewStatsComponent,
    OverviewChartsComponent,
    OverviewReportsComponent,
    OverviewOrdersComponent,
    OverviewAuditComponent,
    OverviewActionsComponent,
    OverviewPreflightComponent
  ],
  imports: [
    CommonModule,
    ChartModule,
    FormsModule,
    SelectModule,
    RouterModule.forChild([{ path: '', component: OverviewComponent }])
  ]
})
export class OverviewModule { 

}

