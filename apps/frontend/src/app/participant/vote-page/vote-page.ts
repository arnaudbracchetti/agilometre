import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzInputModule } from 'ng-zorro-antd/input';
import { JetonParticipantStorage } from '../jeton-participant.storage';
import { ParticipantService } from '../participant.service';

type Phase = 'saisie' | 'attente';

/**
 * Écran participant (carte #36) : saisie du Code puis attente du lancement du vote. Un seul
 * composant pour les deux phases — pas de route dédiée à l'attente, le rechargement retombe sur
 * la même URL et relit le Jeton en storage (doc/spec/annexes/deroulement-session-animee.md,
 * "Jointure d'un participant"). Le sondage de l'état de la Session (détection du vote lancé)
 * arrive avec la carte #37, qui ajoutera `GET /api/participant/moi`.
 */
@Component({
  selector: 'app-vote-page',
  imports: [FormsModule, NzButtonModule, NzInputModule],
  templateUrl: './vote-page.html',
  styleUrl: './vote-page.scss',
})
export class VotePage implements OnInit {
  private readonly participantService = inject(ParticipantService);
  private readonly storage = inject(JetonParticipantStorage);

  protected readonly phase = signal<Phase>('saisie');
  protected readonly code = signal('');
  protected readonly erreur = signal<string | null>(null);
  protected readonly soumissionEnCours = signal(false);
  protected readonly codeValide = computed(() => this.code().trim().length > 0);

  ngOnInit(): void {
    if (this.storage.obtenir()) {
      this.phase.set('attente');
    }
  }

  protected rejoindre(): void {
    const code = this.code().trim();
    if (!code) {
      return;
    }
    this.soumissionEnCours.set(true);
    this.erreur.set(null);
    this.participantService.rejoindre(code).subscribe({
      next: (resultat) => {
        this.storage.enregistrer(resultat.sessionId, resultat.jeton);
        this.soumissionEnCours.set(false);
        this.phase.set('attente');
      },
      error: () => {
        this.soumissionEnCours.set(false);
        // Code inconnu, Session pas encore OUVERTE ou déjà CLOTUREE partagent la même issue
        // (voir RejoindreSession.executer) : un seul message, qui ne présume d'aucune des trois causes.
        this.erreur.set('Code de session invalide ou expiré.');
      },
    });
  }

  protected rejoindreAutreSeance(): void {
    this.code.set('');
    this.erreur.set(null);
    this.phase.set('saisie');
  }
}
