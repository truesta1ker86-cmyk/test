import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-allocation-actions',
  standalone: false,
  templateUrl: './allocation-actions.component.html',
  styleUrls: ['./allocation-actions.component.scss'],
})
export class AllocationActionsComponent {
  @Input() hasChanges = false;
  @Output() preview = new EventEmitter<void>();
  @Output() apply = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();
}