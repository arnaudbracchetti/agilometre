import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ReferentielDto } from '@agilometre/shared';

@Injectable({ providedIn: 'root' })
export class ReferentielService {
  private readonly http = inject(HttpClient);

  obtenirReferentielActif(): Observable<ReferentielDto> {
    return this.http.get<ReferentielDto>('/api/referentiel');
  }
}
