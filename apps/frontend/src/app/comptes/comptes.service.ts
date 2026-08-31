import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Role, UtilisateurDto } from '@agilometre/shared';

@Injectable({ providedIn: 'root' })
export class ComptesService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/comptes';

  lister(): Observable<UtilisateurDto[]> {
    return this.http.get<UtilisateurDto[]>(this.baseUrl);
  }

  creer(email: string, prenom: string, nom: string, role: Role): Observable<UtilisateurDto> {
    return this.http.post<UtilisateurDto>(this.baseUrl, { email, prenom, nom, role });
  }

  modifier(id: string, email: string, prenom: string, nom: string): Observable<UtilisateurDto> {
    return this.http.patch<UtilisateurDto>(`${this.baseUrl}/${id}`, { email, prenom, nom });
  }

  desactiver(id: string): Observable<UtilisateurDto> {
    return this.http.post<UtilisateurDto>(`${this.baseUrl}/${id}/desactiver`, {});
  }

  reactiver(id: string): Observable<UtilisateurDto> {
    return this.http.post<UtilisateurDto>(`${this.baseUrl}/${id}/reactiver`, {});
  }
}
