import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subscription, forkJoin } from 'rxjs';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalModule, NzModalService } from 'ng-zorro-antd/modal';
import { QuestionCouranteDto } from '@agilometre/shared';
import { JetonParticipantStorage } from '../jeton-participant.storage';
import { ParticipantService } from '../participant.service';
import { AideMenu } from '../aide-menu/aide-menu';
import { LETTRES_OPTIONS } from '../../shared/lettres-options';
import { SEUIL_ECHECS_CONNEXION_PERDUE, sonder } from '../../shared/sondage-2s';
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
 * Un Code peut aussi arriver en query param (`?code=`, scan du QR de l'écran de projection,
 * grilling du 2026-09-12) : jointure automatique s'il n'y a pas déjà de Jeton actif, confirmation
 * via Aperçu de Session (ADR-0024) sinon.
 */
@Component({
  selector: 'app-vote-page',
  imports: [
    FormsModule,
    NzButtonModule,
    NzInputModule,
    NzModalModule,
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
  private readonly modal = inject(NzModalService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
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
    const codeUrl = this.route.snapshot.queryParamMap.get('code')?.trim() || null;
    const jeton = this.storage.obtenir();
    if (jeton) {
      this.phase.set('attente');
      this.demarrerSondage(jeton.jeton);
      if (codeUrl) {
        this.proposerBascule(codeUrl, jeton.jeton);
      }
      return;
    }
    if (codeUrl) {
      // Jointure à froid via un Code déjà connu dans l'URL (scan) : automatique, sans confirmation
      // — seule la saisie manuelle au clavier reste soumise à un clic explicite (grilling du
      // 2026-09-12, doc/spec/annexes/deroulement-session-animee.md, "Jointure d'un participant").
      this.code.set(codeUrl);
      this.rejoindre();
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
        this.soumissionEnCours.set(false);
        this.appliquerJetonObtenu(resultat);
      },
      error: () => {
        this.soumissionEnCours.set(false);
        // Code inconnu, Session pas encore OUVERTE ou déjà CLOTUREE partagent la même issue
        // (voir RejoindreSession.executer) : un seul message, qui ne présume d'aucune des trois causes.
        this.erreur.set('Code de session invalide ou expiré.');
      },
    });
  }

  private appliquerJetonObtenu(resultat: { sessionId: string; jeton: string }): void {
    this.storage.enregistrer(resultat.sessionId, resultat.jeton);
    this.phase.set('attente');
    this.demarrerSondage(resultat.jeton);
    this.nettoyerCodeDeLUrl();
  }

  /** Retire `?code=` une fois traité, pour qu'un rechargement (F5, verrouillage d'écran) ne rejoue
   * pas `rejoindre()` — non idempotent côté serveur (RejoindreSession émet un nouveau Jeton et
   * invalide l'ancien à chaque appel, y compris pour la même Session). */
  private nettoyerCodeDeLUrl(): void {
    if (this.route.snapshot.queryParamMap.has('code')) {
      void this.router.navigate([], {
        relativeTo: this.route,
        queryParams: {},
        replaceUrl: true,
      });
    }
  }

  /** Un Jeton est déjà actif ET un Code figure dans l'URL (scan pendant qu'une autre Session est
   * déjà rejointe) : contrairement à la jointure à froid, pas d'appel automatique — un Aperçu de
   * Session (ADR-0024) des deux côtés est affiché pour confirmation, afin de reconnaître une
   * vieille Session mal réinitialisée avant de perdre un vote en cours. */
  private proposerBascule(code: string, jetonActuel: string): void {
    forkJoin({
      actuelle: this.participantService.obtenirInfoSession(jetonActuel),
      cible: this.participantService.obtenirApercuSession(code),
    }).subscribe({
      next: ({ actuelle, cible }) => {
        this.modal.confirm({
          nzTitle: 'Rejoindre une autre séance ?',
          nzContent:
            `Vous êtes connecté à la séance de <strong>${actuelle.equipeNom}</strong> ` +
            `(${this.formaterOuvertureLe(actuelle.ouvertureLe)}).<br>` +
            `Rejoindre à la place celle de <strong>${cible.equipeNom}</strong> ` +
            `(${this.formaterOuvertureLe(cible.ouvertureLe)}) ?`,
          nzOkText: 'Rejoindre',
          nzCancelText: 'Rester ici',
          nzOnOk: () => this.confirmerBascule(code),
          nzOnCancel: () => this.nettoyerCodeDeLUrl(),
        });
      },
      error: (erreur: unknown) => {
        // Un 401 ne peut venir que de `obtenirInfoSession` (protégée par JetonParticipantGuard) —
        // `obtenirApercuSession` est publique, sans guard, ne renvoie jamais 401 aujourd'hui. Si
        // elle gagnait un jour une auth, ce raccourci cesserait d'être valide.
        if (this.estJetonRejete(erreur)) {
          // Jeton actuel déjà invalide côté serveur (vieille Session close) : rien à protéger,
          // rien à comparer — on rejoint directement le Code de l'URL, comme à froid.
          this.sondageAbonnement?.unsubscribe();
          this.storage.effacer();
          this.resetAffichage();
          this.code.set(code);
          this.rejoindre();
          return;
        }
        // Code de l'URL invalide/expiré (404) : rien à signaler, le participant n'a rien tapé —
        // on reste silencieusement sur la Session déjà active.
        this.nettoyerCodeDeLUrl();
      },
    });
  }

  private confirmerBascule(code: string): void {
    const jetonPrecedent = this.storage.obtenir()?.jeton;
    this.participantService.rejoindre(code, jetonPrecedent).subscribe({
      next: (resultat) => this.appliquerJetonObtenu(resultat),
      error: () => {
        this.nettoyerCodeDeLUrl();
        this.modal.error({
          nzTitle: 'Impossible de rejoindre cette séance',
          nzContent: 'Cette séance n’est plus disponible.',
        });
      },
    });
  }

  private formaterOuvertureLe(iso: string | null): string {
    if (!iso) {
      return 'pas encore ouverte';
    }
    return new Date(iso).toLocaleString('fr-FR', {
      dateStyle: 'long',
      timeStyle: 'short',
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
      (erreur, echecsConsecutifs) => {
        if (this.estJetonRejete(erreur)) {
          this.sessionRejetee();
          return;
        }
        if (echecsConsecutifs >= SEUIL_ECHECS_CONNEXION_PERDUE) {
          this.connexionPerdue.set(true);
        }
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
