import { LOCALE_ID } from '@angular/core';
import localePt from '@angular/common/locales/pt';
import { registerLocaleData } from '@angular/common';

registerLocaleData(localePt);

// e no providers:
const providers = [
  { provide: LOCALE_ID, useValue: 'pt-BR' }
];
