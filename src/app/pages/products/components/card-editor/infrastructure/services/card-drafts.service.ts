import { Injectable } from '@angular/core';
import { Draft } from '../interfaces/card-editor.interfaces';

@Injectable()
export class CardDrafts {
  readonly values = new Map<string, Draft>();
}
