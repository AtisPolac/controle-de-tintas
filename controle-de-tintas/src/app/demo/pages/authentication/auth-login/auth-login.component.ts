// Importações do Angular
import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from 'src/app/core/services/auth.service';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-auth-login',
  standalone: true,
  imports: [FormsModule, RouterModule, CommonModule],
  templateUrl: './auth-login.component.html',
  styleUrls: ['./auth-login.component.scss']
})
export class AuthLoginComponent {
  email = '';
  password = '';
  errorMessage = '';

  constructor(
    private authService: AuthService,
    private router: Router,
    private toastr: ToastrService
  ) {}

  login() {
    this.authService.login(this.email, this.password).subscribe({
      next: (response) => {
        this.authService.setSession(response.user);
        this.router.navigate(['/dashboard/default']);
      },
      error: (err) => this.showError(err)
    });
  }

  // Método para mostrar erro com base no retorno do backend
  showError(error: any) {
    const mensagem =
      error?.error?.mensagem ||
      'Erro ao tentar fazer login. Verifique suas credenciais ou tente novamente mais tarde.';

    this.toastr.error(mensagem, 'Erro no login', {
      positionClass: 'toast-top-right',
      timeOut: 3000,
      closeButton: true
    });
  }

  SignInOptions = [
    { image: 'assets/images/authentication/google.svg', name: 'Google' },
    { image: 'assets/images/authentication/twitter.svg', name: 'Twitter' },
    { image: 'assets/images/authentication/facebook.svg', name: 'Facebook' }
  ];
}
