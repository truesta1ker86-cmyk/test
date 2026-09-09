import { Component } from '@angular/core';

@Component({
  selector: 'app-team',
  standalone: false,
  templateUrl: './team.component.html',
  styleUrls: ['./team.component.scss']
})
export class TeamComponent {

  pageTitle = 'Команда';
  pageSubtitle = 'Выдавайте сотрудникам отдельные токены. Их можно отключить в любой момент.';

}
