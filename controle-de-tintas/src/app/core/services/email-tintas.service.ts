// src/app/core/services/email-tintas.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface MailAttachment {
  filename:    string;
  content:     string;    // base64 sem prefixo data:
  encoding:    'base64';
  cid:         string;
  contentType: string;    // ex: 'image/png'
}

const agora = new Date();
const data = agora.toLocaleDateString('pt-BR'); // ex: 23/04/2025
const hora = agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }); // ex: 06:45
const subject = `Estoque de Tintas: ${data} - ${hora}`;

@Injectable({ providedIn: 'root' })
export class EmailTintasService {
  private readonly API = 'http://192.168.8.47:3000/api/tintas/send-report';

  constructor(private http: HttpClient) {}

  sendReportWithAttachments(
    attachments: MailAttachment[],
    estoque: {
      offset: { amarelo: number, magenta: number, ciano: number, preto: number },
      plana: { amarelo: number, magenta: number, ciano: number, preto: number }
    }
  ): Observable<any> {
    const agora = new Date();
    const data = agora.toLocaleDateString('pt-BR');
    const hora = agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const subject = `Estoque de Tintas: ${data} - ${hora}`;

    const body = {
      subject,
      html: `
            <div style="font-family: Arial, sans-serif; color: #333;">
                <h2 style="color: #2c3e50;">Relatório de Nível e Estoque de Tinta</h2>

                <p style="font-size: 16px; margin-bottom: 20px;">
                    ${this.getSaudacao()}
                    <br/>Prezados, segue o nível da central de tintas e estoques:
                </p>

                <table style="width:100%; text-align:center; border-collapse:collapse; margin-bottom: 30px;">
                <tr>
                    ${attachments.map(att => `
                    <td style="padding:12px; border: 1px solid #ddd;">
                        <img src="cid:${att.cid}" width="720" height="250" style="border-radius: 8px;" /><br/>
                    </td>
                    `).join('')}
                </tr>
                </table>

                <h3 style="margin-top: 20px; background-color: #ecf0f1; padding: 10px; border-radius: 6px; color: #2c3e50;">
                Estoque - Rotativas
                </h3>
                <table cellpadding="10" style="
                border-collapse: collapse;
                text-align: center;
                width: 100%;
                margin-bottom: 30px;
                box-shadow: 0 2px 6px rgba(0,0,0,0.1);
                ">
                <thead style="background-color: #3498db; color: white;">
                    <tr>
                    <th>Amarelo</th><th>Magenta</th><th>Ciano</th><th>Preto</th>
                    </tr>
                </thead>
                <tbody>
                    <tr style="background-color: #f9f9f9;">
                    <td>${estoque.offset.amarelo} kg</td>
                    <td>${estoque.offset.magenta} kg</td>
                    <td>${estoque.offset.ciano} kg</td>
                    <td>${estoque.offset.preto} kg</td>
                    </tr>
                </tbody>
                </table>

                <h3 style="margin-top: 20px; background-color: #ecf0f1; padding: 10px; border-radius: 6px; color: #2c3e50;">
                Estoque - Planas
                </h3>
                <table cellpadding="10" style="
                border-collapse: collapse;
                text-align: center;
                width: 100%;
                box-shadow: 0 2px 6px rgba(0,0,0,0.1);
                ">
                <thead style="background-color: #27ae60; color: white;">
                    <tr>
                    <th>Amarelo</th><th>Magenta</th><th>Ciano</th><th>Preto</th>
                    </tr>
                </thead>
                <tbody>
                    <tr style="background-color: #f9f9f9;">
                    <td>${estoque.plana.amarelo} kg</td>
                    <td>${estoque.plana.magenta} kg</td>
                    <td>${estoque.plana.ciano} kg</td>
                    <td>${estoque.plana.preto} kg</td>
                    </tr>
                </tbody>
                </table>

                <p style="font-size: 12px; color: #888; text-align: center; margin-top: 40px;">
                Relatório gerado automaticamente por <strong>Sistema de Controle de Tintas</strong>.
                </p>
            </div>
            `,
      attachments
    };
    return this.http.post(this.API, body);
  }

  private getSaudacao(): string {
    const hora = new Date().getHours();
    if (hora >= 6 && hora < 12) return 'Bom dia!';
    if (hora >= 12 && hora < 18) return 'Boa tarde!';
    return 'Boa noite!';
  }
}
