import { describe, expect, it } from 'vitest';
import { CombinedGraphQLErrors, ServerError } from '@apollo/client/errors';
import { codigoDeError, mensajeDeError } from './errores';

const errorGraphql = (codigo?: string) =>
  new CombinedGraphQLErrors({
    data: null,
    errors: [{ message: 'x', extensions: codigo ? { codigo, servicio: 'materiales' } : {} }],
  });

describe('errores', () => {
  it('toma el codigo de extensions y devuelve el mensaje del catálogo', () => {
    expect(codigoDeError(errorGraphql('MATERIAL_INACTIVO'))).toBe('MATERIAL_INACTIVO');
    expect(mensajeDeError(errorGraphql('SIN_PERMISO'))).toBe('No tienes permiso para hacer esta acción.');
    expect(mensajeDeError(errorGraphql('OBRA_NO_ENCONTRADA'))).toBe('Obra no encontrada');
  });

  it('rellena {codigo} en CODIGO_MATERIAL_REPETIDO (criterio 4)', () => {
    expect(mensajeDeError(errorGraphql('CODIGO_MATERIAL_REPETIDO'), { codigo: 'CEM-IP30' })).toBe(
      'Ya existe un material con el código CEM-IP30',
    );
  });

  it('un codigo desconocido o sin codigo usa el mensaje de error inesperado', () => {
    expect(mensajeDeError(errorGraphql('OTRO'))).toMatch(/^Ocurrió un error inesperado/);
    expect(mensajeDeError(errorGraphql())).toMatch(/^Ocurrió un error inesperado/);
  });

  it('lee el codigo del cuerpo cuando el gateway responde con estado de error (401)', () => {
    const cuerpo = JSON.stringify({ errors: [{ message: 'x', extensions: { codigo: 'NO_AUTENTICADO' } }] });
    const error = new ServerError('401', { response: new Response(cuerpo, { status: 401 }), bodyText: cuerpo });
    expect(mensajeDeError(error)).toBe('Tu sesión terminó. Vuelve a iniciar sesión.');
  });

  it('un error de red muestra que no hay conexión', () => {
    expect(mensajeDeError(new TypeError('Failed to fetch'))).toBe(
      'No hay conexión con el servidor. Revisa tu conexión a internet e intenta de nuevo.',
    );
  });
});
