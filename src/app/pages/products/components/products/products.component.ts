import { Component } from '@angular/core';

@Component({
  selector: 'app-products',
  standalone: false,
  templateUrl: './products.component.html',
  styleUrls: ['./products.component.scss']
})
export class ProductsComponent { 

  pageTitle = 'Карточки товаров';
  pageSubtitle = 'Товары маркетплейса: характеристики, доставленные продажи и подготовка карточек';

}
