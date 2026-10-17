import { Component, computed, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Account } from './contracts';
import { date } from '../core/format';
import { StockAutomationPanel } from './stock-automation';

@Component({
  selector: 'app-account-profile',
  imports: [RouterLink, StockAutomationPanel],
  templateUrl: './account-profile.html',
  styleUrl: './account-profile.css',
})
export class AccountProfile {
  readonly account = input.required<Account>();
  readonly settings = output<string>();
  readonly refresh = output<void>();
  readonly currentShop = computed(() =>
    this.account().shops.find((shop) => shop.tenant_id === this.account().session.tenant_id),
  );
  readonly role = computed(() =>
    this.account().is_owner
      ? 'Владелец'
      : {
          manager: 'Менеджер',
          stock_operator: 'Оператор склада',
          viewer: 'Наблюдатель',
        }[this.account().session.role] || this.account().session.role,
  );
  readonly date = date;
}
