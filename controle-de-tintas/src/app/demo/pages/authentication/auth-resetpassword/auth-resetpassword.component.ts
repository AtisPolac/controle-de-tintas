import { Component } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from 'src/app/core/services/auth.service';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';

@Component({
  selector: 'app-auth-resetpassword',
  standalone: true,
  imports: [FormsModule, RouterModule, CommonModule, HttpClientModule],
  templateUrl: './auth-resetpassword.component.html',
  styleUrls: ['./auth-resetpassword.component.scss']
})
export class AuthResetpasswordComponent {
  senha: string = '';
  confirmarSenha: string = '';
  carregando: boolean = false;
  token: string = '';
  tokenValido: boolean = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private toastr: ToastrService,
    private authService: AuthService,
    private http: HttpClient
  ) {
    this.token = this.route.snapshot.paramMap.get('token') || '';
    if (!this.token) {
      this.toastr.error('Token inválido.');
      this.router.navigate(['/esqueceu-senha']);
    } else {
      this.verificarToken();
    }
  }

  verificarToken() {
    this.authService.verificarToken(this.token).subscribe({
      next: (res) => {
        if (res.valido) {
          this.tokenValido = true;
        } else {
          this.tokenValido = false;
          this.toastr.error('Token inválido ou expirado.');
          this.router.navigate(['/esqueceu-senha']);
        }
      },
      error: () => {
        this.tokenValido = false;
        this.toastr.error('Token inválido ou expirado.');
        this.router.navigate(['/esqueceu-senha']);
      }
    });
  }
  

  resetarSenha(): void {
    if (!this.tokenValido) {
      this.toastr.error('Token inválido ou expirado.');
      return;
    }

    if (!this.senha || !this.confirmarSenha) {
      this.toastr.error('Preencha ambos os campos!');
      return;
    }

    if (this.senha.length < 6) {
      this.toastr.error('A senha deve ter no mínimo 6 caracteres.');
      return;
    }

    if (this.senha !== this.confirmarSenha) {
      this.toastr.error('As senhas não coincidem.');
      return;
    }

    this.carregando = true;

    this.authService.redefinirSenha(this.token, this.senha).subscribe({
      next: () => {
        this.carregando = false;
        this.toastr.success('Senha redefinida com sucesso!');
        this.router.navigate(['/login']);
      },
      error: () => {
        this.carregando = false;
        this.toastr.error('Erro ao redefinir senha.');
      }
    });
  }
}
