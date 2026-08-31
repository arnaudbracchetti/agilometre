import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzInputModule } from 'ng-zorro-antd/input';
import { AuthService } from '../auth.service';

/**
 * Réponse toujours affichée comme un succès, qu'un compte corresponde ou non à l'email saisi —
 * anti-oracle porté jusqu'à l'UI (doc/spec/annexes/gestion-des-droits.md, "Authentification").
 * Remplace le renvoi d'invitation : fonctionne aussi pour un compte jamais activé.
 */
@Component({
  selector: 'app-mot-de-passe-oublie-page',
  imports: [FormsModule, RouterLink, NzButtonModule, NzInputModule],
  templateUrl: './mot-de-passe-oublie-page.html',
  styleUrl: './mot-de-passe-oublie-page.scss',
})
export class MotDePasseOubliePage {
  private readonly auth = inject(AuthService);

  protected readonly email = signal('');
  protected readonly enCours = signal(false);
  protected readonly envoye = signal(false);

  protected demander(): void {
    this.enCours.set(true);
    this.auth.demanderReinitialisation(this.email()).subscribe({
      next: () => {
        this.enCours.set(false);
        this.envoye.set(true);
      },
      error: () => {
        this.enCours.set(false);
        this.envoye.set(true);
      },
    });
  }
}
