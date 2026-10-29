import type { TonoEstado } from '../compartido/EstadoChip';

// Estado del stock → chip (docs/diseno-visual.md: BAJO error, JUSTO atención, OK éxito).
// El estado lo calcula Materiales al leer (reglas del negocio); aquí solo se muestra.

export type EstadoStock = 'BAJO' | 'JUSTO' | 'OK';

const PRESENTACION: Record<EstadoStock, { etiqueta: string; tono: TonoEstado }> = {
  BAJO: { etiqueta: 'Bajo', tono: 'error' },
  JUSTO: { etiqueta: 'Justo', tono: 'atencion' },
  OK: { etiqueta: 'OK', tono: 'exito' },
};

export function presentacionEstado(estado: EstadoStock): { etiqueta: string; tono: TonoEstado } {
  return PRESENTACION[estado];
}

/** Unidad en singular o plural según la cantidad (`1 bolsa`, `120 bolsas`, `0 bolsas`). */
export function unidadSegunCantidad(cantidad: number, unidad: string, unidadPlural: string): string {
  return cantidad === 1 ? unidad : unidadPlural;
}

/** Texto de ayuda con la regla de los estados (reglas-negocio.md, «Materiales»). */
export const AYUDA_ESTADOS =
  'Bajo: menos que el mínimo · Justo: entre el mínimo y 125 % del mínimo · OK: más de 125 % del mínimo.';
