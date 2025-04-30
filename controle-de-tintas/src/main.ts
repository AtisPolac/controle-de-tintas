import { enableProdMode, importProvidersFrom } from '@angular/core';
import { environment } from './environments/environment';
import { BrowserModule, bootstrapApplication } from '@angular/platform-browser';
import { AppRoutingModule } from './app/app-routing.module';
import { AppComponent } from './app/app.component';
import { ToastrModule } from 'ngx-toastr';  // Importar o ToastrModule
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';  // Importar o BrowserAnimationsModule
import { HttpClientModule } from '@angular/common/http'; // <--- ADICIONE ISSO

if (environment.production) {
  enableProdMode();
}

bootstrapApplication(AppComponent, {
  providers: [
    importProvidersFrom(
      BrowserModule,
      AppRoutingModule,
      BrowserAnimationsModule,  // Adicionar o BrowserAnimationsModule
      HttpClientModule, // <--- ADICIONE AQUI TAMBÉM
      ToastrModule.forRoot({    // Configurar o ToastrModule
        timeOut: 3000,
        closeButton: true,
        progressBar: true,
        progressAnimation: 'increasing',
      })
    )
  ],
}).catch((err) => console.error(err));
