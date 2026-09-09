import { Component } from '@angular/core';

@Component({
  selector: 'app-mapping',
  standalone: false,
  templateUrl: './mapping.component.html',
  styleUrls: ['./mapping.component.scss']
})
export class MappingComponent {

  pageTitle = 'Связь товаров с 1С';
  pageSubtitle = 'Артикул маркетплейса ↔ номенклатура 1С. Свяжите товары один раз — себестоимость, остатки и расчёт цен будут обновляться из 1С.';

}