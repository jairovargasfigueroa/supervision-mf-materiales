import { describe, expect, it } from 'vitest';
import { puedeGestionarMateriales, puedeVerAgentes, rolesEfectivos } from './permisos';

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

  it('el panel de agentes es de admin, gerente y residente (502, criterios 15 y 18)', () => {
    expect(puedeVerAgentes(['admin'])).toBe(true);
    expect(puedeVerAgentes(['gerente'])).toBe(true);
    expect(puedeVerAgentes(['offline_access', 'residente'])).toBe(true);
    expect(puedeVerAgentes(['almacenero'])).toBe(false);
    expect(puedeVerAgentes(['maestro', 'cliente'])).toBe(false);
    expect(puedeVerAgentes([])).toBe(false);
  });
});
