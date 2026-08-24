import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { CdkDragDrop } from '@angular/cdk/drag-drop';
import { SelectionEditor, DragPayload } from './selection-editor';

const themesFixture = [
  {
    id: 't1',
    libelle: 'Thème A',
    questions: [
      { id: 'q1', libelle: 'Question 1', themeId: 't1', options: [] },
      { id: 'q2', libelle: 'Question 2', themeId: 't1', options: [] },
    ],
  },
];

const selectionFixture = [
  { questionId: 'q1', libelle: 'Question 1', themeId: 't1', themeLibelle: 'Thème A' },
];

function creerComponent(verrouillee = false) {
  TestBed.configureTestingModule({
    imports: [SelectionEditor],
    providers: [provideNoopAnimations()],
  });
  const fixture = TestBed.createComponent(SelectionEditor);
  fixture.componentRef.setInput('themes', themesFixture);
  fixture.componentRef.setInput('selection', selectionFixture);
  fixture.componentRef.setInput('verrouillee', verrouillee);
  fixture.detectChanges();
  return fixture;
}

describe('SelectionEditor', () => {
  it('dérive le panneau gauche en excluant les Questions déjà sélectionnées', () => {
    const fixture = creerComponent();

    const panneau = fixture.componentInstance['panneauGauche']();

    expect(panneau[0].questionsRestantes.map((q) => q.id)).toEqual(['q2']);
  });

  it('replie tous les Thèmes par défaut', () => {
    const fixture = creerComponent();

    expect(fixture.componentInstance['expandedThemeIds']().size).toBe(0);
    expect(fixture.nativeElement.querySelector('.selection-editor__theme-questions')).toBeNull();
  });

  it('déplie un Thème au clic sur son chevron, et le replie au second clic', () => {
    const fixture = creerComponent();

    fixture.componentInstance['toggleThemeExpansion']('t1');
    expect(fixture.componentInstance['expandedThemeIds']().has('t1')).toBe(true);

    fixture.componentInstance['toggleThemeExpansion']('t1');
    expect(fixture.componentInstance['expandedThemeIds']().has('t1')).toBe(false);
  });

  it('déplie et replie tous les Thèmes via les contrôles globaux', () => {
    const fixture = creerComponent();

    fixture.componentInstance['deplierTousLesThemes']();
    expect(fixture.componentInstance['expandedThemeIds']()).toEqual(new Set(['t1']));

    fixture.componentInstance['replierTousLesThemes']();
    expect(fixture.componentInstance['expandedThemeIds']().size).toBe(0);
  });

  it('calcule la couverture de la Sélection par Thème', () => {
    const fixture = creerComponent();

    const couverture = fixture.componentInstance['couvertureParTheme']();

    expect(couverture).toEqual([
      expect.objectContaining({ id: 't1', libelle: 'Thème A', count: 1 }),
    ]);
  });

  it('émet ajouterQuestion au clic sur le bouton de transfert', () => {
    const fixture = creerComponent();
    const emissions: { questionId: string; position?: number }[] = [];
    fixture.componentInstance.ajouterQuestion.subscribe((evt) => emissions.push(evt));

    fixture.componentInstance['ajouterQuestionViaBouton']('q2');

    expect(emissions).toEqual([{ questionId: 'q2' }]);
  });

  it('n’émet rien via les boutons d’ajout quand verrouillee est vrai', () => {
    const fixture = creerComponent(true);
    const emissions: unknown[] = [];
    fixture.componentInstance.ajouterQuestion.subscribe((evt) => emissions.push(evt));
    fixture.componentInstance.ajouterTheme.subscribe((evt) => emissions.push(evt));

    fixture.componentInstance['ajouterQuestionViaBouton']('q2');
    fixture.componentInstance['ajouterThemeViaBouton'](['q2']);

    expect(emissions).toEqual([]);
  });

  it('émet retirerQuestion au clic sur le bouton de retrait, même verrouillee', () => {
    const fixture = creerComponent(true);
    const emissions: string[] = [];
    fixture.componentInstance.retirerQuestion.subscribe((id) => emissions.push(id));

    fixture.componentInstance['retirer']('q1');

    expect(emissions).toEqual(['q1']);
  });

  it('onDropIntoReferentiel — retire toujours la Question, même verrouillee', () => {
    const fixture = creerComponent(true);
    const emissions: string[] = [];
    fixture.componentInstance.retirerQuestion.subscribe((id) => emissions.push(id));
    const event = {
      previousContainer: { id: 'selection-list' },
      container: { id: 'theme-questions-t1' },
      item: { data: { type: 'question', questionId: 'q1' } },
    } as unknown as CdkDragDrop<unknown, unknown, DragPayload>;

    fixture.componentInstance['onDropIntoReferentiel'](event);

    expect(emissions).toEqual(['q1']);
  });

  it('onDropIntoSelection — réordonne au sein de la liste de Sélection', () => {
    const fixture = creerComponent();
    const emissions: { questionId: string; position: number }[] = [];
    fixture.componentInstance.reordonnerQuestion.subscribe((evt) => emissions.push(evt));
    const conteneur = { id: 'selection-list' };
    const event = {
      previousContainer: conteneur,
      container: conteneur,
      previousIndex: 0,
      currentIndex: 1,
      item: { data: { type: 'question', questionId: 'q1' } },
    } as unknown as CdkDragDrop<unknown, unknown, DragPayload>;

    fixture.componentInstance['onDropIntoSelection'](event);

    expect(emissions).toEqual([{ questionId: 'q1', position: 1 }]);
  });

  it('onDropIntoSelection — ajoute une Question déposée depuis le Référentiel', () => {
    const fixture = creerComponent();
    const emissions: { questionId: string; position?: number }[] = [];
    fixture.componentInstance.ajouterQuestion.subscribe((evt) => emissions.push(evt));
    const event = {
      previousContainer: { id: 'theme-questions-t1' },
      container: { id: 'selection-list' },
      previousIndex: 0,
      currentIndex: 1,
      item: { data: { type: 'question', questionId: 'q2' } },
    } as unknown as CdkDragDrop<unknown, unknown, DragPayload>;

    fixture.componentInstance['onDropIntoSelection'](event);

    expect(emissions).toEqual([{ questionId: 'q2', position: 1 }]);
  });

  it('onDropIntoSelection — n’émet rien quand verrouillee est vrai', () => {
    const fixture = creerComponent(true);
    const emissions: unknown[] = [];
    fixture.componentInstance.ajouterQuestion.subscribe((evt) => emissions.push(evt));
    fixture.componentInstance.reordonnerQuestion.subscribe((evt) => emissions.push(evt));
    const event = {
      previousContainer: { id: 'theme-questions-t1' },
      container: { id: 'selection-list' },
      previousIndex: 0,
      currentIndex: 1,
      item: { data: { type: 'question', questionId: 'q2' } },
    } as unknown as CdkDragDrop<unknown, unknown, DragPayload>;

    fixture.componentInstance['onDropIntoSelection'](event);

    expect(emissions).toEqual([]);
  });
});
