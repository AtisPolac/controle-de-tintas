// Angular Imports
import { Component, Input, Output, EventEmitter, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { Router } from '@angular/router';
import { AuthService } from 'src/app/core/services/auth.service';

// Project Imports

// Icons
import { IconService, IconDirective } from '@ant-design/icons-angular';
import {
  BellOutline,
  SettingOutline,
  GiftOutline,
  MessageOutline,
  PhoneOutline,
  CheckCircleOutline,
  LogoutOutline,
  EditOutline,
  UserOutline,
  ProfileOutline,
  WalletOutline,
  QuestionCircleOutline,
  LockOutline,
  CommentOutline,
  UnorderedListOutline,
  ArrowRightOutline,
  GithubOutline
} from '@ant-design/icons-angular/icons';

import { NgbDropdownModule, NgbNavModule } from '@ng-bootstrap/ng-bootstrap';
import { NgScrollbarModule } from 'ngx-scrollbar';

@Component({
  selector: 'app-nav-right',
  standalone: true,
  imports: [IconDirective, RouterModule, NgScrollbarModule, NgbNavModule, NgbDropdownModule],
  templateUrl: './nav-right.component.html',
  styleUrls: ['./nav-right.component.scss']
})
export class NavRightComponent {

  user: any = null; // Armazena os dados do usuário
  setting: { icon: string; title: string }[] = [];
  windowWidth: number;
  screenFull: boolean = true;

  @Input() styleSelectorToggle!: boolean;
  @Output() Customize = new EventEmitter<void>();

  private iconService = inject(IconService);

  constructor(private authService: AuthService, private router: Router) {
    this.user = this.authService.getCurrentUser(); // Obtém os dados do usuário logado
    this.windowWidth = window.innerWidth;

    this.iconService.addIcon(
      CheckCircleOutline,
      GiftOutline,
      MessageOutline,
      SettingOutline,
      PhoneOutline,
      LogoutOutline,
      UserOutline,
      EditOutline,
      ProfileOutline,
      QuestionCircleOutline,
      LockOutline,
      CommentOutline,
      UnorderedListOutline,
      ArrowRightOutline,
      BellOutline,
      GithubOutline,
      WalletOutline
    );

    this.setUserSettings(); // Chama o método para definir configurações
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']); // Redireciona para a tela de login
  }

  private setUserSettings() {
    //console.log(this.user["class"])
    if (this.user && this.user["class"] >= 2) {
      this.setting = [
        {
          icon: 'user',
          title: 'Gerenciar Usuários'
        },
        {
          icon: 'setting',
          title: 'Configurações Avançadas'
        }
      ];
    }
  }
   // Função para gerenciar o clique na opção "Gerenciar Usuários"
  manageUsers() {
  }

  // Função para gerenciar o clique na opção "Configurações Avançadas"
  advancedSettings() {
  }
}
