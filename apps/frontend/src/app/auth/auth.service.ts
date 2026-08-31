import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, tap } from 'rxjs';
import { JetonUtilisateurDto, Role, UtilisateurDto } from '@agilometre/shared';

interface ChargeJeton {
  sub: string;
  email: string;
  role: Role;
  exp: number;
}

const CLE_JETON = 'agilometre.jeton';

/**
 * Le Rôle vient du payload du JWT, jamais d'un aller-retour réseau supplémentaire — même principe
 * que DroitsService, voir docs/design/agregat-politique-des-droits.md §2.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly _role = signal<Role | null>(this.roleDuJetonStocke());

  readonly role = this._role.asReadonly();
  readonly estConnecte = computed(() => this._role() !== null);

  login(email: string, motDePasse: string): Observable<void> {
    return this.http.post<JetonUtilisateurDto>('/api/auth/login', { email, motDePasse }).pipe(
      tap((reponse) => this.stockerJeton(reponse.jeton)),
      map(() => undefined),
    );
  }

  demanderReinitialisation(email: string): Observable<void> {
    return this.http.post<void>('/api/mot-de-passe/oubli', { email });
  }

  definirMotDePasse(jeton: string, motDePasse: string): Observable<void> {
    return this.http.post<void>('/api/mot-de-passe/definir', { jeton, motDePasse });
  }

  changerMotDePasse(motDePasseActuel: string, nouveauMotDePasse: string): Observable<void> {
    return this.http.post<void>('/api/mot-de-passe/changer', {
      motDePasseActuel,
      nouveauMotDePasse,
    });
  }

  obtenirMonCompte(): Observable<UtilisateurDto> {
    return this.http.get<UtilisateurDto>('/api/mon-compte');
  }

  logout(): void {
    localStorage.removeItem(CLE_JETON);
    this._role.set(null);
  }

  jetonActuel(): string | null {
    return localStorage.getItem(CLE_JETON);
  }

  /** Renouvellement glissant : remplace le jeton stocké par celui réémis par AuthGuard. */
  mettreAJourJeton(jeton: string): void {
    this.stockerJeton(jeton);
  }

  private stockerJeton(jeton: string): void {
    localStorage.setItem(CLE_JETON, jeton);
    this._role.set(this.decoder(jeton)?.role ?? null);
  }

  private roleDuJetonStocke(): Role | null {
    const jeton = this.jetonActuel();
    if (!jeton) return null;
    const charge = this.decoder(jeton);
    if (!charge || charge.exp * 1000 <= Date.now()) return null;
    return charge.role;
  }

  private decoder(jeton: string): ChargeJeton | null {
    try {
      return JSON.parse(atob(jeton.split('.')[1])) as ChargeJeton;
    } catch {
      return null;
    }
  }
}
