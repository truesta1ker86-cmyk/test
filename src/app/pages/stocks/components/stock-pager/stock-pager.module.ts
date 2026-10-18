import { NgModule } from '@angular/core';
import { StockPager } from './stock-pager.component';
import { FormsModule } from '@angular/forms';

@NgModule({
  declarations: [StockPager],
  imports: [FormsModule],
  exports: [StockPager],
})
export class StockPagerModule {}
