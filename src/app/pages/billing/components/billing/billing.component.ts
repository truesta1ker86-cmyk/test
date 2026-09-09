import { Component } from '@angular/core';

@Component({
  selector: 'app-billing',
  standalone: false,
  templateUrl: './billing.component.html',
  styleUrls: ['./billing.component.scss']
})
export class BillingComponent { 
  
  pageTitle = 'Баланс и пополнение';
  pageSubtitle = 'Один AI-баланс для 2 магазина · заявки и операции показаны для текущего магазина';

}