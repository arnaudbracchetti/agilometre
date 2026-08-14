import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { Component } from '@angular/core';
import { AppBreadcrumb } from './app-breadcrumb';

@Component({ selector: 'app-stub', template: 'stub' })
class StubPage {}

describe('AppBreadcrumb', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          {
            path: '',
            component: AppBreadcrumb,
            children: [{ path: 'organisation', data: { breadcrumb: 'Organisation' }, component: StubPage }],
          },
        ]),
      ],
    });
  });

  it('affiche « Accueil › Organisation » pour la route active', async () => {
    const harness = await RouterTestingHarness.create('/organisation');

    const items: NodeListOf<HTMLElement> = harness.routeNativeElement!.querySelectorAll(
      '.app-breadcrumb li',
    );
    const texts = Array.from(items).map((el) => el.textContent?.trim());
    expect(texts).toEqual(['Accueil', '›', 'Organisation']);
  });
});
