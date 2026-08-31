import { Habilitation } from './habilitation';

describe('Habilitation', () => {
  it('creer — porte un entiteId seul', () => {
    const habilitation = Habilitation.creer('h1', { entiteId: 'e1' });

    expect(habilitation.id).toBe('h1');
    expect(habilitation.entiteId).toBe('e1');
    expect(habilitation.equipeId).toBeNull();
  });

  it('creer — porte un equipeId seul', () => {
    const habilitation = Habilitation.creer('h1', { equipeId: 'eq1' });

    expect(habilitation.id).toBe('h1');
    expect(habilitation.entiteId).toBeNull();
    expect(habilitation.equipeId).toBe('eq1');
  });

  it('reconstituer — restitue id/entiteId/equipeId tels quels', () => {
    const habilitation = Habilitation.reconstituer('h1', 'e1', null);

    expect(habilitation.id).toBe('h1');
    expect(habilitation.entiteId).toBe('e1');
    expect(habilitation.equipeId).toBeNull();
  });
});
