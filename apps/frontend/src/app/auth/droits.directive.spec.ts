import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ADroit } from './droits.directive';
import { DroitsService } from './droits.service';

@Component({
  imports: [ADroit],
  template: `@if (true) {
    <span *aDroit="'gererOrganisation'">visible</span>
  }`,
})
class HoteTest {}

describe('ADroit', () => {
  let fixture: ComponentFixture<HoteTest>;
  let droitsFactice: { peut: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    droitsFactice = { peut: vi.fn() };
    TestBed.configureTestingModule({
      imports: [HoteTest],
      providers: [{ provide: DroitsService, useValue: droitsFactice }],
    });
  });

  it('affiche le contenu projeté quand la capacité est accordée', () => {
    droitsFactice.peut.mockReturnValue(true);
    fixture = TestBed.createComponent(HoteTest);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('visible');
    expect(droitsFactice.peut).toHaveBeenCalledWith('gererOrganisation');
  });

  it('ne rend rien quand la capacité est refusée', () => {
    droitsFactice.peut.mockReturnValue(false);
    fixture = TestBed.createComponent(HoteTest);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).not.toContain('visible');
  });
});
