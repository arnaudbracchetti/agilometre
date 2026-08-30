import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withRouterConfig } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
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
  UnorderedListOutline,
  ExclamationCircleOutline,
  QuestionCircleOutline,
  DownOutline,
  CaretRightFill,
  CaretUpOutline,
  CaretDownOutline,
  BarChartOutline,
  SearchOutline,
  UserOutline,
  CheckCircleFill,
  MinusCircleOutline,
  ClockCircleOutline,
  StepForwardOutline,
  UndoOutline,
  WarningOutline,
  LeftOutline,
  RightOutline,
  RiseOutline,
  FallOutline,
  ArrowRightOutline,
} from '@ant-design/icons-angular/icons';
import { registerLocaleData } from '@angular/common';
import fr from '@angular/common/locales/fr';

import { routes } from './app.routes';
import { authInterceptor } from './auth/auth.interceptor';

registerLocaleData(fr);

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    // Nécessaire depuis que app.routes.ts imbrique les routes (pour un fil d'Ariane correct,
    // carte breadcrumb-imbrication) : par défaut Angular n'hérite les paramètres d'un ancêtre
    // que via un enfant à chemin vide ('emptyOnly') — 'pilotage'/'synthese'/':themeId' sont des
    // chemins non vides et perdraient sinon le `:id`/`:id` porté par leur route parente.
    provideRouter(routes, withRouterConfig({ paramsInheritanceStrategy: 'always' })),
    provideHttpClient(withInterceptors([authInterceptor])),
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
      UnorderedListOutline,
      ExclamationCircleOutline,
      QuestionCircleOutline,
      DownOutline,
      CaretRightFill,
      CaretUpOutline,
      CaretDownOutline,
      BarChartOutline,
      SearchOutline,
      UserOutline,
      CheckCircleFill,
      MinusCircleOutline,
      ClockCircleOutline,
      StepForwardOutline,
      UndoOutline,
      WarningOutline,
      LeftOutline,
      RightOutline,
      RiseOutline,
      FallOutline,
      ArrowRightOutline,
    ]),
  ],
};
