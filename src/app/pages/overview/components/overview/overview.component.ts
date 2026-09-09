import { Component } from '@angular/core';

@Component({
  selector: 'app-overview',
  standalone: false,
  templateUrl: './overview.component.html',
  styleUrls: ['./overview.component.scss']
})
export class OverviewComponent {

    pageTitle = 'Обзор';
    pageSubtitle = 'Сводка по интеграции';

}
