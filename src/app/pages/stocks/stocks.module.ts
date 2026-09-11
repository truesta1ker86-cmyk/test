import { NgModule, NO_ERRORS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { InventoryComponent } from './components/inventory/inventory.component';
import { AllocationComponent } from './components/allocation/allocation.component';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TooltipModule } from 'primeng/tooltip';
import { InventoryFilterComponent } from './components/inventory/inventory-filter/inventory-filter.component';
import { InventoryReconciliationComponent } from './components/inventory/inventory-reconciliation/inventory-reconciliation.component';
import { InventoryDetailComponent } from './components/inventory/inventory-detail/inventory-detail.component';
import { FormsModule } from '@angular/forms';
import { DataTableModule } from '../../shared/data-table/data-table.module';
import { DialogModule } from 'primeng/dialog';
import { AllocationMatrixComponent } from './components/allocation/allocation-matrix/allocation-matrix.component';
import { AllocationWorkspaceComponent } from './components/allocation/allocation-workspace/allocation-workspace.component';
import { StockService } from './infrastructure/services/stock.service';
import { ProductService } from './infrastructure/services/product.service';
import { AllocationActionsComponent } from './components/allocation/allocation-actions/allocation-actions.component';
import { AllocationSettingsComponent } from './components/allocation/allocation-settings/allocation-settings.component';
import { AllocationService } from './infrastructure/services/allocation.service';
import { AllocationWarehouseSettingsComponent } from './components/allocation/allocation-warehouse-settings/allocation-warehouse-settings.component';
import { AllocationFilterComponent } from './components/allocation/allocation-filter/allocation-filter.component';
import { FilterVisiblePipe } from './infrastructure/pipes/filter-visible.pipe';
import { FilterPipe } from './infrastructure/pipes/filter.pipe';
import { WarehousePickerComponent } from './components/allocation/warehouse-picker/warehouse-picker.component';
import { AllocationMatrixCellComponent } from './components/allocation/allocation-matrix/allocation-matrix-cell/allocation-matrix-cell.component';
import { FilterPanelModule } from '../../shared/directives/filter-panel/filter-panel.module';
import { PopupButtonModule } from '../../shared/popup-button/popup-button.module';
import { InputModule } from '../../shared/ui/input/input.module';



const routes: Routes = [
  { path: '', redirectTo: 'inventory', pathMatch: 'full' },
  { path: 'inventory', component: InventoryComponent },
  { path: 'allocation', component: AllocationComponent }
];

@NgModule({
  declarations: [
    InventoryComponent,
    InventoryFilterComponent,
    InventoryReconciliationComponent,
    InventoryDetailComponent,     
    AllocationComponent,
    AllocationWorkspaceComponent,
    AllocationMatrixComponent,
    AllocationWarehouseSettingsComponent,
    AllocationActionsComponent,
    AllocationSettingsComponent,
    AllocationFilterComponent,
    AllocationMatrixCellComponent,
    WarehousePickerComponent,    
    FilterVisiblePipe,
    FilterPipe
  ],
  providers: [
    StockService,
    ProductService,
    AllocationService
  ],
  imports: [
    CommonModule,
    TableModule,
    ButtonModule,
    InputTextModule,
    SelectModule,
    TooltipModule,  
    FormsModule,
    DataTableModule,
    DialogModule,
    PopupButtonModule,
    RouterModule.forChild(routes),
    FilterPanelModule,
    InputModule
  ]
})
export class StocksModule { }
