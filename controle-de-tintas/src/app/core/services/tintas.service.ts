import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { forkJoin, Observable } from 'rxjs';
import { map } from 'rxjs/operators';


interface Medicao {
  id: number;
  yellow: number;
  magenta: number;
  cyan: number;
  black: number;
  hora: string;          // "HH:mm"
  user: string;
  dataRegistro: string;  // ISO string
}

interface Abastecimento {
  id: number;
  tinta: 'yellow'|'magenta'|'cyan'|'black';
  quantidadeAbastecida: number; // em kg
  dataRegistro: string;         // ISO string
}

export interface Estoque {
  id: number;
  amarelo: number;
  magenta: number;
  ciano: number;
  preto: number;
  hora: string;
  user: string;
  dataRegistro: string;
}

interface ConsumptionRate {
  start: Date;
  end: Date;
  intervalHours: number;
  byColor: { yellow: number; magenta: number; cyan: number; black: number; };
}


@Injectable({
  providedIn: 'root',
})
export class TintasService {
  private baseUrl = 'https:/api/tintas'; // ajuste conforme seu backend

  constructor(private http: HttpClient) {}

  getAbastecimentos(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/abastecimentos`);
  }

  getMedicoes(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/medicoes`);
  }

   // novos métodos
  getEstoqueOffset(): Observable<Estoque[]> {
    return this.http.get<Estoque[]>('https:/api/tintas/estoque_offset');
  }
  getEstoquePlana(): Observable<Estoque[]> {
    return this.http.get<Estoque[]>('https:/api/tintas/estoque_plana');
  }

  private getConsumptionRates(): Observable<ConsumptionRate[]> {
    return forkJoin({
      medicoes: this.getMedicoes(),
      abastecimentos: this.getAbastecimentos()
    }).pipe(
      map(({ medicoes, abastecimentos }) => {
        medicoes.sort((a, b) => new Date(a.dataRegistro).getTime() - new Date(b.dataRegistro).getTime());
        abastecimentos.sort((a, b) => new Date(a.dataRegistro).getTime() - new Date(b.dataRegistro).getTime());

        const calcStoredKg = (cm: number, color: keyof ConsumptionRate['byColor']): number => {
          const TANK_HEIGHT = 134, TAPE = 11, BOCAL = 2;
          const capacities = { yellow: 5073, magenta: 2770, cyan: 2770, black: 2770 };
          const netGap = cm - TAPE - BOCAL;
          const height = Math.max(0, TANK_HEIGHT - netGap);
          return Math.max(0, height * (capacities[color] / TANK_HEIGHT));
        };

        const rates: ConsumptionRate[] = [];
        for (let i = 0; i < medicoes.length - 1; i++) {
          const cur = medicoes[i], next = medicoes[i + 1];
          const t0 = new Date(cur.dataRegistro), t1 = new Date(next.dataRegistro);
          const hours = (t1.getTime() - t0.getTime()) / 3_600_000;
          if (hours <= 0) continue;

          const sums = { yellow: 0, magenta: 0, cyan: 0, black: 0 };
          for (const ab of abastecimentos) {
            const ta = new Date(ab.dataRegistro);
            if (ta > t0 && ta <= t1) sums[ab.tinta] += ab.quantidadeAbastecida;
          }

          const byColor = {} as ConsumptionRate['byColor'];
          (Object.keys(sums) as (keyof typeof sums)[]).forEach(color => {
            const consumed = (calcStoredKg(cur[color], color) - calcStoredKg(next[color], color))
                            + sums[color];
            byColor[color] = consumed > 0 ? consumed / hours : 0;
          });

          rates.push({ start: t0, end: t1, intervalHours: hours, byColor });
        }

        return rates;
      })
    );
  }

  /**
   * Retorna um único objeto com o consumo médio por hora de cada tinta
   * baseado apenas nos intervalos que terminaram nas últimas 12 horas.
   */
  getLast12hAverageConsumption(): Observable<ConsumptionRate['byColor']> {
    const MS_12H = 12 * 3_600_000;
    return this.getConsumptionRates().pipe(
      map(rates => {
        const cutoff = Date.now() - MS_12H;
        let totalHours = 0;
        const weighted: { [K in keyof ConsumptionRate['byColor']]: number } = {
          yellow: 0, magenta: 0, cyan: 0, black: 0
        };

        for (const r of rates) {
          if (r.end.getTime() >= cutoff) {
            totalHours += r.intervalHours;
            for (const color of Object.keys(r.byColor) as (keyof typeof r.byColor)[]) {
              weighted[color] += r.byColor[color] * r.intervalHours;
            }
          }
        }

        // Se não houver dados, retorna zeros
        if (totalHours === 0) {
          return { yellow: 0, magenta: 0, cyan: 0, black: 0 };
        }

        // Weighted average: soma(consumo*horas)/soma(horas)
        const avg: ConsumptionRate['byColor'] = {
          yellow: weighted.yellow / totalHours,
          magenta: weighted.magenta / totalHours,
          cyan:   weighted.cyan   / totalHours,
          black:  weighted.black  / totalHours
        };
        return avg;
      })
    );
  }
}