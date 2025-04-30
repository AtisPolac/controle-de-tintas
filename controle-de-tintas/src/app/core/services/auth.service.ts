import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';

interface User {
  username: string;
  surname: string;
  password?: string; // opcional, não deve vir do backend
  email: string;
  role: string;
  class: number;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {


  redefinirSenha(token: string, novaSenha: string): Observable<any> {
    const body = { token, novaSenha };
    return this.http.post('http://192.168.8.47:3000/api/auth/redefinir-senha', body);
  }

  verificarToken(token: string) {
    return this.http.get<{ valido: boolean }>(`http://192.168.8.47:3000/api/auth/verificar-token/${token}`);
  }

  private currentUser: User | null = null;

  constructor(private http: HttpClient, private router: Router) {}

  // Faz login no backend
  login(email: string, password: string): Observable<any> {
    return this.http.post('http://192.168.8.47:3000/api/auth/login', { email, password });
  }

  // Salva dados do usuário logado
  setSession(user: User): void {
    this.currentUser = user;
    localStorage.setItem('isAuthenticated', 'true');
    localStorage.setItem('currentUser', JSON.stringify(user));
  }

  // Faz logout
  logout(): void {
    this.currentUser = null;
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('currentUser');
    this.router.navigate(['/auth/login']);
  }

  // Verifica se o usuário está logado
  isLoggedIn(): boolean {
    return localStorage.getItem('isAuthenticated') === 'true';
  }

  // Recupera o usuário atual
  getCurrentUser(): User | null {
    if (!this.currentUser) {
      const userData = localStorage.getItem('currentUser');
      this.currentUser = userData ? JSON.parse(userData) : null;
    }
    return this.currentUser;
  }
  
}
