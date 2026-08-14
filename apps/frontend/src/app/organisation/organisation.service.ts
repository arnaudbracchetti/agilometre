import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { EntiteDto } from '@agilometre/shared';

@Injectable({ providedIn: 'root' })
export class OrganisationService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/organisation/entites';

  listerEntites(): Observable<EntiteDto[]> {
    return this.http.get<EntiteDto[]>(this.baseUrl);
  }

  creerEntite(nom: string): Observable<EntiteDto> {
    return this.http.post<EntiteDto>(this.baseUrl, { nom });
  }

  renommerEntite(id: string, nom: string): Observable<EntiteDto> {
    return this.http.patch<EntiteDto>(`${this.baseUrl}/${id}`, { nom });
  }
}
