// src/app/theme/shared/apexchart/ink-consumption-gauge/ink-consumption-gauge.component.ts
import { Component, OnInit, OnDestroy, ViewChildren, QueryList } from '@angular/core';
import { NgApexchartsModule, ChartComponent  } from 'ng-apexcharts';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { TintasService } from 'src/app/core/services/tintas.service';
import {
  ApexChart,
  ApexPlotOptions,
  ApexStroke,
  ApexFill
} from 'ng-apexcharts';
import { interval, Subscription } from 'rxjs';
import { Observable, take, tap, mapTo } from 'rxjs';
import { switchMap, startWith } from 'rxjs/operators';
import { MailAttachment } from 'src/app/core/services/email-tintas.service';

interface InkGauge {
  label: string;
  value: number;
  kg: string;
  fill: ApexFill;
  plotOptions: ApexPlotOptions;
}



@Component({
  selector: 'app-ink-consumption-gauge',
  standalone: true,
  imports: [NgApexchartsModule, CommonModule, HttpClientModule],
  template: `
    <div class="gauge-wrapper" *ngIf="inks.length">
      <div class="gauge-container" *ngFor="let ink of inks">
        <h6>{{ ink.label }}</h6>
        <apx-chart
          [series]="[ink.value]"
          [chart]="chart"
          [plotOptions]="ink.plotOptions"
          [stroke]="stroke"
          [fill]="ink.fill"
          [labels]="[ink.label]"
        ></apx-chart>
        <div class="kg-text">{{ ink.kg }} kg</div>
      </div>
    </div>

    <div class="update-info" *ngIf="ultimaAtualizacao">
      Última atualização: {{ ultimaAtualizacao.dataHora }} por: {{ ultimaAtualizacao.usuario }}
    </div>
  `,
  styles: [`
    .gauge-wrapper {
      display: flex;
      flex-wrap: wrap;
      gap: 1rem;
      justify-content: center;
      align-items: flex-end;
    }
    .gauge-container {
      text-align: center;
      min-width: 150px;
    }
    .kg-text {
      margin-top: 0.5rem;
      font-weight: bold;
      font-size: 1.2rem;
    }
    .update-info {
      margin-top: 1rem;
      text-align: center;
      font-size: 1rem;
      color: #666;
      font-style: italic;
    }
  `]
})
export class InkConsumptionGaugeComponent implements OnInit, OnDestroy {

  @ViewChildren(ChartComponent) private chartComps!: QueryList<ChartComponent>;


  chart: ApexChart = {
    type: 'radialBar',
    height: 200,
    sparkline: { enabled: true }
  };

  stroke: ApexStroke = {
    lineCap: 'round'
  };

  inks: InkGauge[] = [];
  ultimaAtualizacao: { dataHora: string; usuario: string } | null = null;
  private pollingSubscription!: Subscription;
  charts: any;

  constructor(private tintasService: TintasService) {}

  ngOnInit() {
    this.pollingSubscription = interval(10_000).pipe(
      startWith(0),
      switchMap(() => this.tintasService.getMedicoes())
    ).subscribe({
      next: (data) => {
        if (data?.length) {
          const latest = data.reduce((p, c) =>
            new Date(c.dataregistro) > new Date(p.dataregistro) ? c : p
          );
          this.initGauges(latest);
          this.setUltimaAtualizacao(latest);
        }
      },
      error: (err) => console.error('Erro ao carregar medições:', err)
    });
  }

  ngOnDestroy() {
    this.pollingSubscription?.unsubscribe();
  }

  private initGauges(measure: any) {
    const TANK_HEIGHT_CM = 134;
    const TAPE_CM = 11;
    const BOCAL_CM = 2;

    const configs = [
      { label: 'Amarela', key: 'yellow',   color: '#FFD700', capacity: 5073 },
      { label: 'Magenta', key: 'magenta',  color: '#E91E63', capacity: 2770 },
      { label: 'Ciano',   key: 'cyan',     color: '#03A9F4', capacity: 2770 },
      { label: 'Preto',   key: 'black',    color: '#000000', capacity: 2770 }
    ];

    this.inks = configs.map(cfg => {
      const measureCm = Number(measure[cfg.key]) || 0;
      const netGap = measureCm - TAPE_CM - BOCAL_CM;
      const inkHeight = Math.max(0, TANK_HEIGHT_CM - netGap);
      const kgPerCm = cfg.capacity / TANK_HEIGHT_CM;
      const storedKg = Math.max(0, inkHeight * kgPerCm);
      const pct = Math.max(0, (storedKg / cfg.capacity) * 100);

      return {
        label: cfg.label,
        value: Math.round(pct),
        kg: storedKg.toFixed(3).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.'),
        fill: { colors: [cfg.color] },
        plotOptions: this.getPlotOptions()
      };
    });
  }

  private setUltimaAtualizacao(measure: any) {
    const data = new Date(measure.dataregistro);
    const hora = measure.hora || '00:00';

    const dataFormatada = `${data.getDate().toString().padStart(2, '0')}/` +
                          `${(data.getMonth() + 1).toString().padStart(2, '0')}/` +
                          `${data.getFullYear()}`;

    this.ultimaAtualizacao = {
      dataHora: `${dataFormatada} ${hora}`,
      usuario: measure.user || 'Desconhecido'
    };
  }

  private getPlotOptions(): ApexPlotOptions {
    return {
      radialBar: {
        startAngle: -90,
        endAngle: 90,
        hollow: { size: '50%' },
        dataLabels: {
          name: { show: false },
          value: {
            offsetY: 5,
            fontSize: '30px',
            formatter: (val: number) => `${val}%`
          }
        }
      }
    };
  }

  public getAttachments(): Promise<MailAttachment[]> {
    const colors = ['yellow','magenta','cyan','black'];
    return Promise.all(
      this.chartComps.toArray().map((chartComp, idx) =>
        chartComp.dataURI().then(({ imgURI }) => {
          const base64 = imgURI.split(',')[1];
          const cor = colors[idx] || `chart${idx}`;
          return {
            filename: `${cor}.png`,
            content: base64,
            encoding: 'base64',
            cid: `gauge_${cor}@mail`,
            contentType: 'image/png'
          } as MailAttachment;
        })
      )
    );
  }

  public manualUpdate$(): Observable<void> {
    return this.tintasService.getMedicoes().pipe(
      take(1),
      tap(data => {
        if (data?.length) {
          const latest = data.reduce((p, c) =>
            new Date(c.dataregistro) > new Date(p.dataregistro) ? c : p
          );
          this.initGauges(latest);
          this.setUltimaAtualizacao(latest);
        }
      }),
      mapTo(void 0)
    );
  }

  
}