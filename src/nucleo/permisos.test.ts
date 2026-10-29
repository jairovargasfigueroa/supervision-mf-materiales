import { describe, expect, it } from 'vitest';
import { puedeGestionarMateriales, rolesEfectivos } from './permisos';

describe('permisos de materiales', () => {
  it('solo admin puede gestionar (criterios 2 y 7)', () => {
    expect(puedeGestionarMateriales(['admin'])).toBe(true);
    expect(puedeGestionarMateriales(['residente'])).toBe(false);
    expect(puedeGestionarMateriales(['gerente'])).toBe(false);
    expect(puedeGestionarMateriales([])).toBe(false);
  });

  it('ignora los roles técnicos de Keycloak y el de cliente', () => {
    const token = ['default-roles-supervision', 'offline_access', 'uma_authorization', 'residente', 'cliente'];
    expect(rolesEfectivos(token)).toEqual(['residente']);
    expect(puedeGestionarMateriales(token)).toBe(false);
    expect(puedeGestionarMateriales(['offline_access', 'admin'])).toBe(true);
  });

  it('un rol con nombre parecido no cuenta', () => {
    expect(puedeGestionarMateriales(['administrador', 'Admin'])).toBe(false);
  });
});
