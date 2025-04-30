import { Component } from '@angular/core';
import { RouterModule, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ToastrService } from 'ngx-toastr'; // Importando o serviço do Toastr

@Component({
  selector: 'app-auth-register',
  imports: [RouterModule, FormsModule, CommonModule],
  templateUrl: './auth-register.component.html',
  styleUrls: ['./auth-register.component.scss'],
  standalone: true,
})
export class AuthRegisterComponent {
  firstName = '';
  lastName = '';
  funcao = '';
  email = '';
  password = '';
  cpassword = '';
  carregando = false;

  SignUpOptions = [
    // Opções para cadastro (caso necessário)
  ];

  constructor(
    private http: HttpClient,
    private router: Router,
    private toastr: ToastrService // Injetando o serviço Toastr
  ) {}

  register() {
    // Remover espaços desnecessários
    const nome = this.firstName.trim();
    const sobrenome = this.lastName.trim();
    const funcao = this.funcao.trim();
    const email = this.email.trim().toLowerCase();
    const senha = this.password;
    const confirmarSenha = this.cpassword;
  
    // Verificar campos obrigatórios
    if (!nome || !sobrenome || !funcao || !email || !senha || !confirmarSenha) {
      this.toastr.error('Preencha todos os campos!');
      return;
    }
  
    // Validar nome e sobrenome (apenas letras e espaços)
    const nomeRegex = /^[A-Za-zÀ-ú\s]+$/;
    if (!nomeRegex.test(nome) || !nomeRegex.test(sobrenome)) {
      this.toastr.error('Nome e sobrenome devem conter apenas letras!');
      return;
    }
  
    // Validar e-mail
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      this.toastr.error('E-mail inválido!');
      return;
    }
  
  // Senha mínima de 6 caracteres
  if (this.password.length < 6) {
    this.toastr.error('A senha deve ter pelo menos 6 caracteres.');
    return;
  }
  
    if (senha !== confirmarSenha) {
      this.toastr.error('Senhas não coincidem!');
      return;
    }
  
    const payload = {
      nome,
      sobrenome,
      funcao,
      email,
      senha
    };
  
    this.carregando = true;
  
    this.http.post('http://192.168.8.47:3000/api/auth/register', payload)
      .subscribe({
        next: (res: any) => {
          this.toastr.success(res.mensagem || 'Cadastro iniciado! Verifique seu e-mail.');
          this.router.navigate(['/login']);
        },
        error: (err) => {
          console.error(err);
          this.toastr.error(err.error?.mensagem || 'Erro ao cadastrar.');
          this.carregando = false;
        }
      });
  }
}
