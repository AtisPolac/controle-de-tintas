// angular import
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

// Project import
import { AdminComponent } from './theme/layouts/admin-layout/admin-layout.component';
import { GuestLayoutComponent } from './theme/layouts/guest-layout/guest-layout.component';
import { AuthGuard } from 'src/app/core/guards/auth.guard';
import { GuestGuard } from 'src/app/core/guards/guest.guard';



const routes: Routes = [
  {
    path: '',
    redirectTo: '/login',
    pathMatch: 'full'
  },
  {
    path: '',
    component: AdminComponent,
    children: [
      {
        path: 'dashboard/default',
        loadComponent: () => import('./demo/dashboard/default/default.component').then((c) => c.DefaultComponent),
        canActivate: [AuthGuard] // Bloqueia acesso sem login
      },
      {
        path: 'lancamentos',
        loadComponent: () => import('./demo/component/basic-component/typography/lancamentos.component').then((c) => c.LancamentosComponent),
        canActivate: [AuthGuard] // Bloqueia acesso sem login
      },
      {
        path: 'color',
        loadComponent: () => import('./demo/component/basic-component/color/color.component').then((c) => c.ColorComponent),
        canActivate: [AuthGuard] // Bloqueia acesso sem login
      }      
    ]
  },
  {
    path: '',
    component: GuestLayoutComponent,
    children: [
      {
        path: 'login',
        loadComponent: () => import('./demo/pages/authentication/auth-login/auth-login.component').then((c) => c.AuthLoginComponent),
        canActivate: [GuestGuard] // Impede usuários logados de acessar login
      },
      {
        path: 'register',
        loadComponent: () =>
          import('./demo/pages/authentication/auth-register/auth-register.component').then((c) => c.AuthRegisterComponent),
        canActivate: [GuestGuard] // Impede usuários logados de acessar login
      },
      {
        path: 'esqueceu-senha',
        loadComponent: () => import('./demo/pages/authentication/auth-forgotpassword/auth-forgotpassword.component').then((c) => c.ForgetPasswordComponent),
        canActivate: [GuestGuard] // Impede usuários logados de acessar login
      },
      {
        path: 'redefinir-senha/:token',
        loadComponent: () => import('./demo/pages/authentication/auth-resetpassword/auth-resetpassword.component').then((c) => c.AuthResetpasswordComponent),
        canActivate: [GuestGuard] // Impede usuários logados de acessar login
      },
      
    ]
  }
];


@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule {}
