import { Component, Output, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from 'src/app/core/services/auth.service';

// project import
import { NavContentComponent } from './nav-content/nav-content.component';
import { NavigationItems, NavigationItem } from './navigation'; // Importando os itens de navegação

@Component({
  selector: 'app-navigation',
  imports: [NavContentComponent, CommonModule],
  templateUrl: './navigation.component.html',
  styleUrls: ['./navigation.component.scss']
})
export class NavigationComponent implements OnInit {
  user: any = null; // Armazena os dados do usuário
  windowWidth: number;
  screenFull: boolean = true;
  navigationItems: NavigationItem[] = NavigationItems; // Inicializa com os itens de navegação

  // media 1025 After Use Menu Open
  NavCollapsedMob = Output();
  navCollapsedMob;

  // Constructor
  constructor(private router: Router, private authService: AuthService) {
    this.windowWidth = window.innerWidth;
    this.navCollapsedMob = false;
  }

  // Método chamado após o carregamento do componente
  ngOnInit() {
    // Obtém os dados do usuário logado
    this.user = this.authService.getCurrentUser(); 
    
    // Verifica se o usuário foi carregado e aplica o filtro
    if (this.user) {
      this.filterNavigationItems(); // Chama o filtro após obter o usuário
    }

    this.windowWidth = window.innerWidth;
  }

  // Método para filtrar a navegação com base na classe do usuário
  filterNavigationItems() {
    //console.log('Rodou o filtro');
    //console.log('User:', this.user); // Verifique o objeto do usuário
    //console.log('User class:', this.user["class"]); // Verifique o valor de class

    // Se a classe do usuário for menor que 2, removemos o item 'utilities'
    if (this.user && this.user["class"] < 2) {
      //console.log('Classe do usuário menor que 2, filtrando...');
      this.navigationItems = this.navigationItems.filter(item => {
        // Remove o grupo 'utilities'
        return item.id !== 'utilities';
      });
    }
  }

  // public method
  navCollapseMob() {
    if (this.windowWidth < 1025) {
      this.NavCollapsedMob.emit();
    }
  }
}
