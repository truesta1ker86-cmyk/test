import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-order-bulk-actions',
  standalone: false,
  templateUrl: './order-bulk-actions.component.html',
  styleUrls: ['./order-bulk-actions.component.scss'],
})
export class OrderBulkActionsComponent {
  @Input() selectedCount = 0;
  @Output() printLabels = new EventEmitter<void>();
}