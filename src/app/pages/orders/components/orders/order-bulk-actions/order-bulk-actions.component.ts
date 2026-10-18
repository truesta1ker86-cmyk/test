import { ChangeDetectionStrategy, Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-order-bulk-actions',
  standalone: false,
  templateUrl: './order-bulk-actions.component.html',
  styleUrls: ['../../orders/orders.component.css'],
})
export class OrderBulkActionsComponent {
  @Input() readyCount = 0;
  @Input() hiddenCount = 0;
  @Input() busy = false;
  @Input() labelsAllowed = false;
  @Output() selectAvailable = new EventEmitter<void>();
  @Output() clearSelection = new EventEmitter<void>();
  @Input() selectedCount = 0;
  @Output() printLabels = new EventEmitter<void>();
}
