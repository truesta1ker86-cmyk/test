import { Component } from '@angular/core';

@Component({
  selector: 'app-overview',
  standalone: false,
  templateUrl: './pricing.component.html',
  styleUrls: ['./pricing.component.scss']
})
export class PricingComponent {

  pageTitle = 'Расчёт цен';
  pageSubtitle = 'Факты: API маркетплейса · Excel: формула минимальной цены';

}
