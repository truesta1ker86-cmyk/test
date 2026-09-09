import { Component, OnInit, signal, Input } from '@angular/core';
import { PreflightCheck } from './infrastructure/interfaces/preflight-check';

@Component({
  selector: 'app-overview-preflight',
  standalone: false,
  templateUrl: './overview-preflight.component.html',
  styleUrls: ['./overview-preflight.component.scss']
})
export class OverviewPreflightComponent implements OnInit {
  @Input() initialChecks: PreflightCheck[] = [];

  checks = signal<PreflightCheck[]>([]);

  ngOnInit(): void {
    if (this.initialChecks.length === 0) {
      this.checks.set([
        { name: 'products', status: 'готово', duration: 275, sample: 1 },
        { name: 'stocks', status: 'готово', duration: 265, sample: 1 },
        { name: 'prices', status: 'готово', duration: 267, sample: 1 },
        { name: 'categories', status: 'готово', duration: 530, sample: 29 }
      ]);
    } else {
      this.checks.set([...this.initialChecks]);
    }
  }
}
