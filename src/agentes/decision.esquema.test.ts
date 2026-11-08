import { describe, expect, it } from 'vitest';
import { esquemaAprobar, esquemaRechazar, MENSAJE_COMENTARIO, MENSAJE_MOTIVO } from './decision.esquema';

const errores = (r: { success: boolean; error?: { issues: { message: string }[] } }) =>
  r.success ? [] : (r.error?.issues.map((i) => i.message) ?? []);

describe('esquemas de la decisión (502, criterios 12 y 13)', () => {
  it('el comentario al aprobar es opcional y de hasta 300 caracteres', () => {
    expect(esquemaAprobar.safeParse({ texto: '' }).success).toBe(true);
    expect(esquemaAprobar.safeParse({ texto: 'a'.repeat(300) }).success).toBe(true);
    expect(errores(esquemaAprobar.safeParse({ texto: 'a'.repeat(301) }))).toEqual([MENSAJE_COMENTARIO]);
  });

  it('el motivo al rechazar tiene de 10 a 500 caracteres sin contar los espacios de los extremos', () => {
    expect(errores(esquemaRechazar.safeParse({ texto: '' }))).toEqual([MENSAJE_MOTIVO]);
    expect(errores(esquemaRechazar.safeParse({ texto: '   123456789   ' }))).toEqual([MENSAJE_MOTIVO]);
    expect(esquemaRechazar.safeParse({ texto: '1234567890' }).success).toBe(true);
    expect(esquemaRechazar.safeParse({ texto: 'a'.repeat(500) }).success).toBe(true);
    expect(errores(esquemaRechazar.safeParse({ texto: 'a'.repeat(501) }))).toEqual([MENSAJE_MOTIVO]);
    expect(MENSAJE_MOTIVO).toBe('El motivo debe tener entre 10 y 500 caracteres.');
  });
});
