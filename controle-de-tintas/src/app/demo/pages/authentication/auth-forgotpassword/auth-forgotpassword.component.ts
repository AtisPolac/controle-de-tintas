import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ToastrService } from 'ngx-toastr'; // Importando o serviço do Toastr
import { CommonModule } from '@angular/common'; // Necessário para o funcionamento do standalone component
import { HttpClient } from '@angular/common/http'; // Para fazer chamadas HTTP

@Component({
  selector: 'app-auth-forgotpassword',
  standalone: true, // Permite usar imports diretamente aqui
  imports: [FormsModule, RouterModule, CommonModule], // Agora FormsModule é importado corretamente
  templateUrl: './auth-forgotpassword.component.html',
  styleUrls: ['./auth-forgotpassword.component.scss']
})
export class ForgetPasswordComponent {
  email: string = '';
  carregando: boolean = false;

  constructor(
    private router: Router,
    private toastr: ToastrService,
    private http: HttpClient // Injetando o HttpClient
  ) {}

  // Método para enviar as instruções de recuperação de senha
  enviarInstrucoes(): void {
    if (!this.email || !this.validarEmail(this.email)) {
      this.toastr.error('Por favor, insira um e-mail válido!');
      return;
    }

    this.carregando = true;

    // Chamando o backend para enviar o e-mail com o link de redefinição
    this.http.post('http://192.168.8.47:3000/api/auth/forgotpassword', { email: this.email })
      .subscribe({
        next: (res: any) => {
          this.toastr.success(res.mensagem || 'Instruções enviadas com sucesso! Verifique seu e-mail.');
          this.router.navigate(['/login']);
        },
        error: (err) => {
          console.error(err);
          this.toastr.error(err.error?.mensagem || 'Erro ao enviar instruções de recuperação.');
          this.carregando = false;
        }
      });
  }

  // Função para validar o formato do e-mail
  validarEmail(email: string): boolean {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(email);
  }
}
