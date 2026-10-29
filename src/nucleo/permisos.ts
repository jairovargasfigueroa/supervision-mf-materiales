import { useSesion } from './sesion';

// Qué acciones ve cada rol en Materiales (docs/permisos.md; 003, criterios 2 y 7). Los roles de
// window.plataforma.sesion.usuario.roles son los del token tal cual: incluyen roles técnicos de Keycloak
// (default-roles-*, offline_access…) y, si la persona también es cliente, `cliente`. En el ERP (azp `erp`)
// solo cuentan los roles internos (convenciones, regla del azp). El gateway y Materiales vuelven a validar.

export const ROLES_INTERNOS = ['admin', 'residente', 'gerente', 'maestro', 'almacenero'] as const;

/** Roles que cuentan en el ERP. */
export function rolesEfectivos(roles: readonly string[]): string[] {
  return roles.filter((rol) => (ROLES_INTERNOS as readonly string[]).includes(rol));
}

/** Crear, editar, activar o desactivar materiales y fijar mínimos: solo `admin`. */
export function puedeGestionarMateriales(roles: readonly string[]): boolean {
  return rolesEfectivos(roles).includes('admin');
}

/** Si el usuario de la sesión del shell puede usar las acciones de escritura. */
export function usePuedeGestionarMateriales(): boolean {
  return puedeGestionarMateriales(useSesion()?.usuario.roles ?? []);
}
