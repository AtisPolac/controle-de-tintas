// angular import
import { Component} from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SpinnerComponent } from './theme/shared/components/spinner/spinner.component';
import { CommonModule } from '@angular/common'; // Necessário para o funcionamento do standalone component


@Component({
  standalone: true,
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  imports: [RouterOutlet, CommonModule],
})
export class AppComponent {

  constructor() {}
  // public props
  title = 'mantis-free-version';
  
}
