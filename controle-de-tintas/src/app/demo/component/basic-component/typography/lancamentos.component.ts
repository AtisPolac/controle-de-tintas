import { Component, AfterViewInit, Renderer2, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastrService } from 'ngx-toastr'; // Serviço de Toastr para notificações
import { CardComponent } from 'src/app/theme/shared/components/card/card.component';
import { FormsModule } from '@angular/forms';
import { AuthService } from 'src/app/core/services/auth.service';
import { EmailTintasService, MailAttachment  } from 'src/app/core/services/email-tintas.service';
import { NgApexchartsModule } from 'ng-apexcharts';
import { InkConsumptionGaugeComponent } from "../../../../theme/shared/apexchart/ink-consumption-gauge/ink-consumption-gauge.component";
import html2canvas from 'html2canvas';


@Component({
  selector: 'app-lancamentos',
  standalone: true,
  imports: [CardComponent, CommonModule, FormsModule, InkConsumptionGaugeComponent, NgApexchartsModule],
  templateUrl: './lancamentos.component.html',
  styleUrls: ['./lancamentos.component.scss']
})
export class LancamentosComponent implements AfterViewInit {


  @ViewChild('gaugeRoot', { static: true }) gaugeRoot!: ElementRef<HTMLDivElement>;
  @ViewChild(InkConsumptionGaugeComponent)
  private gaugeComp!: InkConsumptionGaugeComponent;

  user: any = null; // Armazena os dados do usuário

  carregando = false;

  // Formulário selecionado: 'abastecimento' ou 'medicao'
  selectedForm: string = 'abastecimento';

  // Avaliação da central (número de joinhas)
  avaliacao: number = 0;

  // Dados para o formulário de abastecimento
  abastecimento: any = {
    tinta: '',
    pesoBruto: null,
    pesoLiquido: null,
    quantidadeAbastecida: null,
    embalagem: '',
    lote: '',
    pesoDescarte: null,
    observacoes: '',
    avaliacao: 0,
    user: null,
  };

  // Dados para o formulário de medição
  medicao: any = {
    yellow: null,
    magenta: null,
    cyan: null,
    black: null,
    hora: '',
    user: null,
    estoque: {
      offset: {
        amarelo: 0,
        magenta: 0,
        ciano: 0,
        preto: 0
      },
      plana: {
        amarelo: 0,
        magenta: 0,
        ciano: 0,
        preto: 0
      }
    }
  };
  charts: any;

  constructor(private authService: AuthService, private toastr: ToastrService, private renderer: Renderer2, private emailTintas: EmailTintasService) {

    this.user = this.authService.getCurrentUser(); // Obtém os dados do usuário logado
    //console.log(this.user);
    this.abastecimento.user = `${this.user?.username ?? ''} ${this.user?.surname ?? ''}`.trim();
    this.medicao.user = `${this.user?.username ?? ''} ${this.user?.surname ?? ''}`.trim();

 

  }

  ngAfterViewInit() {
    // opcional: garantir que os gauges já foram inicializados
    //this.enviarRelatorioPorEmail()
  }

  async enviarRelatorioPorEmail(): Promise<void> {
    this.carregando = true;
    try {
      // 1) Garante que o gauge seja recarregado com os dados MAIS ATUAIS:
      await this.gaugeComp.manualUpdate$().toPromise();

      // 2) Agora captura o screenshot:
      const canvas = await html2canvas(this.gaugeRoot.nativeElement, { backgroundColor: '#fff' });
      const dataUrl = canvas.toDataURL('image/png');
      const base64 = dataUrl.split(',')[1];

      const attachment: MailAttachment = {
        filename: 'gauges-full.png',
        content: base64,
        encoding: 'base64',
        cid: 'gauges_full@mail',
        contentType: 'image/png'
      };

      // 3) Envia o e-mail COM o estoque do form:
      await this.emailTintas
        .sendReportWithAttachments([attachment], this.medicao.estoque)
        .toPromise();

      this.toastr.success('Relatório enviado com sucesso!');
      
      // 4) Só agora limpa o form de medição:
      this.resetMedicao();

    } catch (err) {
      console.error('Erro no envio do relatório:', err);
      this.toastr.error('Falha ao enviar relatório.');
    } finally {
      this.carregando = false;
    }
  }

  private resetMedicao() {
    this.medicao = {
      yellow: null,
      magenta: null,
      cyan: null,
      black: null,
      hora: '',
      user: this.medicao.user,
      estoque: {
        offset: { amarelo: 0, magenta: 0, ciano: 0, preto: 0 },
        plana:  { amarelo: 0, magenta: 0, ciano: 0, preto: 0 }
      }
    };
  }

  

  // Alterna entre os formulários
  mostrarFormulario(formulario: string) {
    this.selectedForm = formulario;
  }

  // Define a avaliação da central
  avaliarCentral(valor: number) {
    this.avaliacao = valor;
    this.abastecimento.avaliacao = valor;
    // Opcional: Exibir toast informando a avaliação definida
    //this.toastr.info(`Central avaliada com ${valor} joinhas!`);
  }

  // Envia o formulário de abastecimento
  enviarFormularioAbastecimento(event: Event) {
    event.preventDefault();
  
    // Validações mantidas...
    if (!this.abastecimento.tinta) {
      this.toastr.error("Selecione uma tinta para o abastecimento!");
      return;
    }
    if (!this.abastecimento.pesoBruto || this.abastecimento.pesoBruto <= 0) {
      this.toastr.error("Informe um peso bruto válido (maior que zero)!");
      return;
    }
    if (!this.abastecimento.pesoLiquido || this.abastecimento.pesoLiquido <= 0) {
      this.toastr.error("Informe um peso líquido válido (maior que zero)!");
      return;
    }
    if (!this.abastecimento.quantidadeAbastecida || this.abastecimento.quantidadeAbastecida <= 0) {
      this.toastr.error("Informe uma quantidade abastecida válida (maior que zero)!");
      return;
    }
    if (!this.abastecimento.embalagem) {
      this.toastr.error("Selecione a embalagem do produto!");
      return;
    }
    if (!this.abastecimento.lote) {
      this.toastr.error("Informe o lote do produto!");
      return;
    }
    if (this.avaliacao === 0) {
      this.toastr.error("Você deve avaliar a central de tintas!");
      return;
    }

    this.carregando = true;
  
    fetch('https:/api/tintas/abastecimento', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(this.abastecimento)
    })
    .then(res => {
      if (res.ok) {
        this.toastr.success('Enviado com sucesso!');
        // Limpa os dados
        this.abastecimento = {
          tinta: '',
          pesoBruto: null,
          pesoLiquido: null,
          quantidadeAbastecida: null,
          embalagem: '',
          lote: '',
          pesoDescarte: null,
          observacoes: '',
          centralLimpa: false,
          muitosTambores: false,
          avaliacao: 0,
          user: `${this.user?.username ?? ''} ${this.user?.surname ?? ''}`.trim()
        };
        this.avaliacao = 0;
        this.carregando = false;
      } else {
        this.toastr.error('Erro ao enviar.');
        this.carregando = false;
      }
    })
    .catch(err => {this.toastr.error('Erro de conexão.'); this.carregando = false;});
  }
  

  enviarFormularioMedicao(event: Event) {
  event.preventDefault();

  // Validações mantidas…
  if (this.medicao.yellow == null || this.medicao.yellow < 0) {
    this.toastr.error("Informe um nível válido para Tinta Amarela!");
    return;
  }
  // … (outras validações)

  this.carregando = true;
  this.medicao.user = `${this.user?.username ?? ''} ${this.user?.surname ?? ''}`.trim();

  fetch('https:/api/tintas/medicao', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(this.medicao)
  })
  .then(async res => {
    if (res.ok) {
      this.toastr.success('Medição enviada!');

      // **1) espera 15 segundos antes de disparar o relatório**
      await new Promise(resolve => setTimeout(resolve, 15000));

      // **2) dispara o envio do relatório por e-mail**
      await this.enviarRelatorioPorEmail();

      // **3) só então reseta o form de medição**
      this.medicao = {
        yellow: null,
        magenta: null,
        cyan: null,
        black: null,
        hora: '',
        user: this.medicao.user,
        estoque: {
          offset: { amarelo: 0, magenta: 0, ciano: 0, preto: 0 },
          plana:  { amarelo: 0, magenta: 0, ciano: 0, preto: 0 }
        }
      };
    } else {
      this.toastr.error('Erro ao enviar medição.');
    }
  })
  .catch(err => {
    this.toastr.error('Erro de conexão.');
  })
  .finally(() => {
    this.carregando = false;
  });
}

    
    
  }
