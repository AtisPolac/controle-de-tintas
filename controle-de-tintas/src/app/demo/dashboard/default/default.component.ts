// angular import
import { Component, inject, OnInit, AfterViewInit } from '@angular/core';
import { CommonModule, registerLocaleData } from '@angular/common';
import { TintasService } from 'src/app/core/services/tintas.service';
import Shepherd from 'shepherd.js';


// project import
import tableData from 'src/fake-data/default-data.json';

import localePt from '@angular/common/locales/pt'; // Importando os dados de localidade do Brasil


import { InkConsumptionGaugeComponent } from 'src/app/theme/shared/apexchart/ink-consumption-gauge/ink-consumption-gauge.component';
import { MonthlyBarChartComponent } from 'src/app/theme/shared/apexchart/monthly-bar-chart/monthly-bar-chart.component';
import { IncomeOverviewChartComponent } from 'src/app/theme/shared/apexchart/income-overview-chart/income-overview-chart.component';
import { AnalyticsChartComponent } from 'src/app/theme/shared/apexchart/analytics-chart/analytics-chart.component';
import { SalesReportChartComponent } from 'src/app/theme/shared/apexchart/sales-report-chart/sales-report-chart.component';

// icons
import { IconService, IconDirective } from '@ant-design/icons-angular';
import { FallOutline, GiftOutline, MessageOutline, RiseOutline, SettingOutline } from '@ant-design/icons-angular/icons';
//import { CardComponent } from 'src/app/theme/shared/components/card/card.component';


registerLocaleData(localePt, 'pt-BR');

@Component({
  selector: 'app-default',
  standalone: true,
  imports: [
    CommonModule,
    IconDirective,
    MonthlyBarChartComponent,
    IncomeOverviewChartComponent,
    AnalyticsChartComponent,
    SalesReportChartComponent,
    InkConsumptionGaugeComponent,
  ],
  templateUrl: './default.component.html',
  styleUrls: ['./default.component.scss']
})
export class DefaultComponent implements AfterViewInit  {

  avgConsumption: { yellow: number; magenta: number; cyan: number; black: number } | null = null;
  
  private iconService = inject(IconService);

  // constructor
  constructor(private tintasService: TintasService) {
    this.iconService.addIcon(...[RiseOutline, FallOutline, SettingOutline, GiftOutline, MessageOutline]);
  }

  ngAfterViewInit(): void {
    this.tintasService.getLast12hAverageConsumption().subscribe(avg => {
      this.avgConsumption = avg;
      //this.startTour(); // Agora só inicia o tour após carregar os dados
    });
  }

  private loadConsumptionLevels() {
    this.tintasService.getLast12hAverageConsumption()
      .subscribe(avg => {
        this.avgConsumption = avg;
        //console.log('Consumo médio (kg/h):', avg);
      });
  }

  recentOrder = tableData;

  AnalyticEcommerce = [
    {
      title: 'Total Page Views',
      amount: '4,42,236',
      background: 'bg-light-primary ',
      border: 'border-primary',
      icon: 'rise',
      percentage: '59.3%',
      color: 'text-primary',
      number: '35,000'
    },
    {
      title: 'Total Users',
      amount: '78,250',
      background: 'bg-light-primary ',
      border: 'border-primary',
      icon: 'rise',
      percentage: '70.5%',
      color: 'text-primary',
      number: '8,900'
    },
    {
      title: 'Total Order',
      amount: '18,800',
      background: 'bg-light-warning ',
      border: 'border-warning',
      icon: 'fall',
      percentage: '27.4%',
      color: 'text-warning',
      number: '1,943'
    },
    {
      title: 'Total Sales',
      amount: '$35,078',
      background: 'bg-light-warning ',
      border: 'border-warning',
      icon: 'fall',
      percentage: '27.4%',
      color: 'text-warning',
      number: '$20,395'
    }
  ];

  transaction = [
    {
      background: 'text-success bg-light-success',
      icon: 'gift',
      title: 'Order #002434',
      time: 'Today, 2:00 AM',
      amount: '+ $1,430',
      percentage: '78%'
    },
    {
      background: 'text-primary bg-light-primary',
      icon: 'message',
      title: 'Order #984947',
      time: '5 August, 1:45 PM',
      amount: '- $302',
      percentage: '8%'
    },
    {
      background: 'text-danger bg-light-danger',
      icon: 'setting',
      title: 'Order #988784',
      time: '7 hours ago',
      amount: '- $682',
      percentage: '16%'
    }
  ];

  startTour() {
    const tour = new Shepherd.Tour({
      useModalOverlay: true,
      defaultStepOptions: {
        scrollTo: true,
        cancelIcon: { enabled: true },
        classes: 'bg-light shadow-lg rounded',
      }
    });
  
    tour.addStep({
      id: 'step-gauges',
      text: 'Estes são os medidores de tinta. Eles mostram o nível de tinta em cada tanque.',
      attachTo: {
        element: '.gauge-wrapper',
        on: 'bottom'
      },
      buttons: [
        {
          text: 'Próximo',
          action: tour.next
        }
      ]
    });
  
    tour.addStep({
      id: 'step-update-info',
      text: 'Aqui você pode ver a última atualização dos dados, incluindo a data, hora e usuário que fez a atualização.',
      attachTo: {
        element: '.update-info',
        on: 'top'
      },
      buttons: [
        {
          text: 'Voltar',
          action: tour.back
        },
        {
          text: 'Próximo',
          action: tour.next
        }
      ]
    });

    tour.addStep({
      id: 'step-dados',
      text: 'Aqui você pode ver os dados de abastecimento, medição e estoque de tinta.',
      attachTo: {
        element: '.Dados',
        on: 'right'
      },
      buttons: [
        {
          text: 'Voltar',
          action: tour.back
        },
        {
          text: 'Próximo',
          action: tour.next
        }
      ]
    });


    tour.addStep({
      id: 'step-consumo',
      text: 'Aqui você pode ver o consumo médio de tinta por hora, calculado com base nas medições e abastecimentos realizados.',
      attachTo: {
        element: '.mt-4',
        on: 'top'
      },
      buttons: [
        {
          text: 'Voltar',
          action: tour.back
        },
        {
          text: 'Finalizar',
          action: tour.complete
        }
      ]
    });
  
    tour.start();
  }
  
  
}
