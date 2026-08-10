import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideNzI18n, fr_FR } from 'ng-zorro-antd/i18n';
import { provideNzIcons } from 'ng-zorro-antd/icon';
import { registerLocaleData } from '@angular/common';
import fr from '@angular/common/locales/fr';

import { routes } from './app.routes';

registerLocaleData(fr);

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(),
    provideNzI18n(fr_FR),
    // Enregistrer ici les icônes utilisées au fur et à mesure des écrans (voir ng-zorro-antd/icons/icons).
    provideNzIcons([]),
  ],
};
