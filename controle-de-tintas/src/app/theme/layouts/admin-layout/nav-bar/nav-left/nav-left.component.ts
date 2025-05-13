import { CommonModule } from '@angular/common';
import { Component, Input, Output, EventEmitter, inject } from '@angular/core';

// project import

// icons
import { IconService, IconDirective } from '@ant-design/icons-angular';
import { MenuUnfoldOutline, MenuFoldOutline, SearchOutline } from '@ant-design/icons-angular/icons';

@Component({
  selector: 'app-nav-left',
  imports: [IconDirective, CommonModule],
  templateUrl: './nav-left.component.html',
  styleUrls: ['./nav-left.component.scss']
})
export class NavLeftComponent {
  private iconService = inject(IconService);
  
  // public props
  @Input() navCollapsed: boolean = false; // Indica se a navegação está colapsada
  @Output() NavCollapse = new EventEmitter<void>(); // Emite um evento quando o menu colapsar
  @Output() NavCollapsedMob = new EventEmitter<void>(); // Evento para colapsar o menu em dispositivos móveis
  windowWidth: number;

  // Constructor
  constructor() {
    this.windowWidth = window.innerWidth;
    this.iconService.addIcon(...[MenuUnfoldOutline, MenuFoldOutline, SearchOutline]);
  }

  // public method
  navCollapse() {
    this.navCollapsed = !this.navCollapsed; // Inverte o estado de colapso do menu
    this.NavCollapse.emit(); // Emite o evento para notificar o componente pai
  }
}
