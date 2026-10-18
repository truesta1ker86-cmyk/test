import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import type { Account } from '../../infrastructure/interfaces/contracts.interfaces';
import { date } from '../../../../core/infrastructure/utils/format.utils';

@Component({
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush,

  selector: 'app-account-profile',

  templateUrl: './account-profile.component.html',
  styleUrl: './account-profile.component.css',
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
