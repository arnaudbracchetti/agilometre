import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CampagnePoulsDto } from '@agilometre/shared';

@Injectable({ providedIn: 'root' })
export class CampagnePoulsService {
  private readonly http = inject(HttpClient);

  private baseUrl(equipeId: string): string {
    return `/api/organisation/equipes/${equipeId}/campagne-pouls`;
  }

  obtenirParEquipe(equipeId: string): Observable<CampagnePoulsDto | null> {
    return this.http.get<CampagnePoulsDto | null>(this.baseUrl(equipeId));
  }

  creer(
    equipeId: string,
    modeleCollecteId: string,
    joursEnvoi: number[],
    heureEnvoi: number,
    questionsParEnvoi: number,
  ): Observable<CampagnePoulsDto> {
    return this.http.post<CampagnePoulsDto>(this.baseUrl(equipeId), {
      modeleCollecteId,
      joursEnvoi,
      heureEnvoi,
      questionsParEnvoi,
    });
  }
}
