import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzMessageService } from 'ng-zorro-antd/message';
import { QuestionCouranteDto } from '@agilometre/shared';
import { JetonParticipantStorage } from '../jeton-participant.storage';
import { ParticipantService } from '../participant.service';
import { AideMenu } from '../aide-menu/aide-menu';
import { LETTRES_OPTIONS } from '../../shared/lettres-options';
import { sonder } from '../../shared/sondage-2s';
import { StickyNote } from '../../shared/sticky-note/sticky-note';
import { ErrorMessage } from '../../shared/error-message/error-message';

type Phase = 'saisie' | 'attente' | 'vote';

const INTERVALLE_SONDAGE_PARTICIPANT_MS = 1000;

/**
 * Écran participant (carte D2, #39) : saisie du Code, attente, puis vote quand le Coach ouvre un
 * Tour. Un seul composant pour les trois phases — pas de route dédiée, le rechargement retombe
 * sur la même URL et relit le Jeton en storage (doc/spec/annexes/deroulement-session-animee.md,
 * "Jointure d'un participant"). Sondage 1s de `GET /api/participant/moi` dès qu'un Jeton est
 * connu — rythme volontairement plus rapide que les écrans Coach ("Synchronisation des écrans").
 */
@Component({
  selector: 'app-vote-page',
  imports: [
    FormsModule,
    NzButtonModule,
    NzInputModule,
    StickyNote,
    ErrorMessage,
    AideMenu,
  ],
  templateUrl: './vote-page.html',
  styleUrl: './vote-page.scss',
})
export class VotePage implements OnInit {
  private readonly participantService = inject(ParticipantService);
  private readonly storage = inject(JetonParticipantStorage);
  private readonly message = inject(NzMessageService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly lettres = LETTRES_OPTIONS;
  protected readonly phase = signal<Phase>('saisie');
  protected readonly code = signal('');
  protected readonly erreur = signal<string | null>(null);
  protected readonly soumissionEnCours = signal(false);
  protected readonly codeValide = computed(() => this.code().trim().length > 0);
  protected readonly question = signal<QuestionCouranteDto | null>(null);
  protected readonly optionChoisieIndex = signal<number | null>(null);
  protected readonly voteEnCours = signal(false);
  protected readonly connexionPerdue = signal(false);
  /** Jeton du device connecté — non null en phases 'attente'/'vote', consommé par `app-aide-menu`. */
  protected readonly jetonActuel = signal<string | null>(null);
  /** Reflète « ai-je voté sur le Tour actuellement ouvert » — volontairement non mis à jour tant
   * que `voteOuvert` est false, donc reste figé sur le dernier Tour une fois clos : c'est ce qui
   * permet de distinguer, en phase 'attente', « jamais encore voté » de « Vote enregistré,
   * résultats à l'écran » (doc/spec/annexes/deroulement-session-animee.md, « Écran participant »). */
  protected readonly voteEnregistreSurDernierTour = signal(false);
  /** Ré-abonné à chaque jointure — coupe le sondage précédent, sinon un vieux Jeton continuerait
   * de dicter phase/question par-dessus l'écran courant après « Rejoindre une autre séance ». */
  private sondageAbonnement: Subscription | null = null;

  ngOnInit(): void {
    const jeton = this.storage.obtenir();
    if (jeton) {
      this.phase.set('attente');
      this.demarrerSondage(jeton.jeton);
    }
  }

  protected rejoindre(): void {
    const code = this.code().trim();
    if (!code) {
      return;
    }
    this.soumissionEnCours.set(true);
    this.erreur.set(null);
    // Jeton de la Session quittée, encore en storage tant que enregistrer() ne l'a pas écrasé —
    // permet à RejoindreSession de l'invalider et de sortir ce device du compteur d'origine.
    const jetonPrecedent = this.storage.obtenir()?.jeton;
    this.participantService.rejoindre(code, jetonPrecedent).subscribe({
      next: (resultat) => {
        this.storage.enregistrer(resultat.sessionId, resultat.jeton);
        this.soumissionEnCours.set(false);
        this.phase.set('attente');
        this.demarrerSondage(resultat.jeton);
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
    this.sondageAbonnement?.unsubscribe();
    this.resetAffichage();
  }

  /** Vraie déconnexion (menu d'assistance) : contrairement à `rejoindreAutreSeance`, vide aussi le
   * storage — ici aucune jointure suivante n'est prévue pour écraser le Jeton quitté. */
  protected seDeconnecter(): void {
    this.sondageAbonnement?.unsubscribe();
    this.storage.effacer();
    this.resetAffichage();
  }

  private resetAffichage(): void {
    this.code.set('');
    this.erreur.set(null);
    this.question.set(null);
    this.optionChoisieIndex.set(null);
    this.voteEnregistreSurDernierTour.set(false);
    this.jetonActuel.set(null);
    this.phase.set('saisie');
  }

  /** Jeton rejeté par `JetonParticipantGuard` (401) — invalide, ou Session plus `OUVERTE`
   * (carte #47) : même écran de saisie qu'un Code invalide, sans distinguer la cause
   * (doc/spec/annexes/deroulement-session-animee.md, « Synchronisation des écrans » § Erreurs). */
  protected sessionRejetee(): void {
    this.sondageAbonnement?.unsubscribe();
    this.storage.effacer();
    this.resetAffichage();
    this.erreur.set('Séance terminée ou expirée. Merci de ressaisir le Code de session.');
  }

  private estJetonRejete(erreur: unknown): boolean {
    return erreur instanceof HttpErrorResponse && erreur.status === 401;
  }

  protected voter(index: number): void {
    const jeton = this.storage.obtenir()?.jeton;
    if (!jeton || this.voteEnCours()) {
      return;
    }
    const choixPrecedent = this.optionChoisieIndex();
    this.optionChoisieIndex.set(index); // optimiste : surbrillance immédiate
    this.voteEnCours.set(true);
    this.participantService
      .voter(jeton, index)
      .subscribe({
        next: (etat) => {
          this.voteEnCours.set(false);
          this.optionChoisieIndex.set(etat.optionChoisieIndex);
          this.voteEnregistreSurDernierTour.set(etat.optionChoisieIndex !== null);
        },
        error: (erreur: unknown) => {
          this.voteEnCours.set(false);
          this.optionChoisieIndex.set(choixPrecedent);
          if (this.estJetonRejete(erreur)) {
            this.sessionRejetee();
            return;
          }
          this.message.error('Vote impossible — vérifiez votre connexion et réessayez.');
        },
      });
  }

  private demarrerSondage(jeton: string): void {
    this.jetonActuel.set(jeton);
    this.sondageAbonnement?.unsubscribe();
    this.sondageAbonnement = sonder(
      () => this.participantService.obtenirMoi(jeton),
      (erreur) => {
        if (this.estJetonRejete(erreur)) {
          this.sessionRejetee();
          return;
        }
        this.connexionPerdue.set(true);
      },
      this.destroyRef,
      INTERVALLE_SONDAGE_PARTICIPANT_MS,
    ).subscribe((etat) => {
      this.connexionPerdue.set(false);
      this.question.set(etat.question);
      this.optionChoisieIndex.set(etat.optionChoisieIndex);
      if (etat.voteOuvert) {
        this.voteEnregistreSurDernierTour.set(etat.optionChoisieIndex !== null);
      }
      this.phase.set(etat.voteOuvert ? 'vote' : 'attente');
    });
  }
}
