import { describe, expect, it } from 'vitest';
import { presentacionEstado, unidadSegunCantidad } from './estado-stock';

describe('estado del stock', () => {
  it('BAJO es rojo, JUSTO ámbar y OK verde (criterio 6)', () => {
    expect(presentacionEstado('BAJO')).toEqual({ etiqueta: 'Bajo', tono: 'error' });
    expect(presentacionEstado('JUSTO')).toEqual({ etiqueta: 'Justo', tono: 'atencion' });
    expect(presentacionEstado('OK')).toEqual({ etiqueta: 'OK', tono: 'exito' });
  });

  it('usa la unidad en singular solo para 1', () => {
    expect(unidadSegunCantidad(1, 'bolsa', 'bolsas')).toBe('bolsa');
    expect(unidadSegunCantidad(0, 'bolsa', 'bolsas')).toBe('bolsas');
    expect(unidadSegunCantidad(12.5, 'bolsa', 'bolsas')).toBe('bolsas');
  });
});
