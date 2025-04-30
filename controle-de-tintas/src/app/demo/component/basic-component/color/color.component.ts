import { Component, OnInit } from '@angular/core';
import { HttpClientModule } from '@angular/common/http'; // Importe o HttpClientModule
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { TintasService, Estoque } from 'src/app/core/services/tintas.service';

@Component({
  standalone: true,
  selector: 'app-color',
  templateUrl: './color.component.html',
  styleUrls: ['./color.component.scss'],
  imports: [CommonModule, HttpClientModule]  // Adicione o HttpClientModule aqui
})
export class ColorComponent implements OnInit {


  tabelaSelecionada: 'abastecimento' | 'medicao' | 'offset' | 'plana' = 'abastecimento';

  paginaAtual: number = 1;
  totalPaginas: number = 1;

  abastecimentos: any[] = [];
  medicoes: any[] = [];
  estoquesOffset: Estoque[] = [];
  estoquesPlana:   Estoque[] = [];

  ordemColuna: string = '';
  ordemAscendente: boolean = true;

  ordenar(coluna: string) {
    if (this.ordemColuna === coluna) {
      this.ordemAscendente = !this.ordemAscendente;
    } else {
      this.ordemColuna = coluna;
      this.ordemAscendente = true;
    }
    const direcao = this.ordemAscendente ? 1 : -1;
    const lista = {
      abastecimento: this.abastecimentos,
      medicao:       this.medicoes,
      offset:        this.estoquesOffset,
      plana:         this.estoquesPlana
    }[this.tabelaSelecionada];
    lista.sort((a: any, b: any) => {
      const va = a[coluna], vb = b[coluna];
      if (va < vb) return -1 * direcao;
      if (va > vb) return 1 * direcao;
      return 0;
    });
  }

  classeDaTinta(tinta: string): string {
    switch (tinta?.toUpperCase()) {
      case 'AMARELO':
        return 'label-amarelo';
      case 'CIANO':
        return 'label-ciano';
      case 'MAGENTA':
        return 'label-magenta';
      case 'PRETO':
        return 'label-preto';
      default:
        return '';
    }
  }

  constructor(private tintasService: TintasService) { }

  ngOnInit(): void {
    this.carregarAbastecimentos();
    this.carregarMedicoes();
    this.carregarOffset();
    this.carregarPlana();
  }

  carregarAbastecimentos() {
    this.tintasService.getAbastecimentos().subscribe({
      next: (data) => (this.abastecimentos = data),
      error: (err) => console.error('Erro ao buscar abastecimentos', err),
    });
  }

  carregarOffset() {
    this.tintasService.getEstoqueOffset().subscribe({
      next: data => { this.estoquesOffset = data; this.atualizarTotalPaginas(); },
      error: err => console.error(err)
    });
  }
  carregarPlana() {
    this.tintasService.getEstoquePlana().subscribe({
      next: data => { this.estoquesPlana = data; this.atualizarTotalPaginas(); },
      error: err => console.error(err)
    });
  }

  carregarMedicoes() {
    this.tintasService.getMedicoes().subscribe({
      next: (data) => (this.medicoes = data),
      error: (err) => console.error('Erro ao buscar medições', err),
    });
  }

  ngDoCheck() {
    this.atualizarTotalPaginas();
  }

  atualizarTotalPaginas() {
    let total = 0;
    switch (this.tabelaSelecionada) {
      case 'abastecimento': total = this.abastecimentos.length; break;
      case 'medicao':       total = this.medicoes.length;       break;
      case 'offset':        total = this.estoquesOffset.length; break;
      case 'plana':         total = this.estoquesPlana.length;  break;
    }
    this.totalPaginas = Math.ceil(total / 50);
  }

  
  
  paginaAnterior() {
    if (this.paginaAtual > 1) this.paginaAtual--;
  }

  proximaPagina() {
    if (this.paginaAtual < this.totalPaginas) this.paginaAtual++;
  }

  trocarTabela(tabela: 'abastecimento' | 'medicao' | 'offset' | 'plana') {
    this.tabelaSelecionada = tabela;
    this.paginaAtual = 1;
    this.atualizarTotalPaginas();
  }

}
