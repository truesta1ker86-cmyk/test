import { Component } from '@angular/core';

@Component({
  selector: 'app-imports',
  standalone: false,
  templateUrl: './imports.component.html',
  styleUrls: ['./imports.component.scss']
})
export class ImportsComponent { 
  
  pageTitle = 'Загрузка Excel';
  pageSubtitle = 'Загрузите исходный Excel продавца — сервис распознает структуру, проверит данные и покажет изменения до записи.';

}
