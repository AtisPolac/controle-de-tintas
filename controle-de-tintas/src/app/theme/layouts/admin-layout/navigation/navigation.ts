
// Definição do NavigationItem
export interface NavigationItem {
  
  id: string;
  title: string;
  type: 'item' | 'collapse' | 'group';
  translate?: string;
  icon?: string;
  hidden?: boolean;
  url?: string;
  classes?: string;
  groupClasses?: string;
  exactMatch?: boolean;
  external?: boolean;
  target?: boolean;
  breadcrumbs?: boolean;
  children?: NavigationItem[];
  link?: string;
  description?: string;
  path?: string;
}

// Definindo os itens de navegação
export const NavigationItems: NavigationItem[] = [
  {
    id: 'dashboard',
    title: 'Dashboard',
    type: 'group',
    icon: 'icon-navigation',
    children: [
      {
        id: 'default',
        title: 'Tintas',
        type: 'item',
        classes: 'nav-item',
        url: '/dashboard/default',
        icon: 'dashboard',
        breadcrumbs: false
      },
      {
        id: 'color',
        title: 'Dados',
        type: 'item',
        classes: 'nav-item',
        url: '/color',
        icon: 'unordered-list'
      },
    ]
  },
  {
    id: 'utilities',
    title: 'Lançamentos',
    type: 'group',
    icon: 'icon-navigation',
    children: [
      {
        id: 'typography',
        title: 'Lançamentos',
        type: 'item',
        classes: 'nav-item',
        url: '/lancamentos',
        icon: 'font-size'
      },
    ]
  },
];
