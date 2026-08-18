import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideNzI18n, fr_FR } from 'ng-zorro-antd/i18n';
import { provideNzIcons } from 'ng-zorro-antd/icon';
import { provideNzNativeDateAdapter } from 'ng-zorro-antd/core/time';
import {
  ScheduleOutline,
  MailOutline,
  TeamOutline,
  ApartmentOutline,
  EditOutline,
  CopyOutline,
  DeleteOutline,
  PlayCircleOutline,
  DesktopOutline,
} from '@ant-design/icons-angular/icons';
import { registerLocaleData } from '@angular/common';
import fr from '@angular/common/locales/fr';

import { routes } from './app.routes';

registerLocaleData(fr);

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(),
    provideAnimationsAsync(),
    provideNzI18n(fr_FR),
    provideNzNativeDateAdapter(),
    // Enregistrer ici les icônes utilisées au fur et à mesure des écrans (voir ng-zorro-antd/icons/icons).
    provideNzIcons([
      ScheduleOutline,
      MailOutline,
      TeamOutline,
      ApartmentOutline,
      EditOutline,
      CopyOutline,
      DeleteOutline,
      PlayCircleOutline,
      DesktopOutline,
    ]),
  ],
};
