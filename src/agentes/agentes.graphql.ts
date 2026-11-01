import { gql, type TypedDocumentNode } from '@apollo/client';
import type { TonoEstado } from '../compartido/EstadoChip';
import { useConsultaConRespaldo } from '../nucleo/consulta-respaldo';

// Operaciones del panel «Control de materiales» (502; docs/contratos.md y SDL del diseño de la 502). Lo que escribe
// el agente (situación, causa, evidencia, descripción) es texto: el panel lo muestra como texto.

export type Agente = 'SEGUIMIENTO_OBRAS' | 'CONTROL_MATERIALES' | 'CONTROL_COBROS';
export type EstadoSugerencia = 'PENDIENTE' | 'APROBADA' | 'RECHAZADA';
export type Severidad = 'ALTA' | 'MEDIA' | 'BAJA';

/** El único agente que se ve en Materiales (502, criterio 18). */
export const AGENTE_MATERIALES: Agente = 'CONTROL_MATERIALES';

export interface Evidencia {
  herramienta: string;
  dato: string;
}

export interface Hallazgo {
  ejecucionId: string;
  agente: Agente;
  obraId: string;
  obraNombre: string;
  tipo: string;
  severidad: Severidad;
  situacion: string;
  causaProbable: string;
  evidencia: Evidencia[];
  detectadoEn: string;
}

export interface Sugerencia {
  id: string;
  ejecucionId: string;
  agente: Agente;
  obraId: string;
  obraNombre: string;
  accion: string;
  accionTexto: string;
  descripcion: string;
  estado: EstadoSugerencia;
  creadaEn: string;
}

export const SEVERIDAD: Record<Severidad, { etiqueta: string; tono: TonoEstado }> = {
  ALTA: { etiqueta: 'Alta', tono: 'error' },
  MEDIA: { etiqueta: 'Media', tono: 'atencion' },
  BAJA: { etiqueta: 'Baja', tono: 'neutro' },
};

/** Tipos de hallazgo del agente de materiales (diseño de la 502, «CONTROL_MATERIALES»). */
const TIPO_HALLAZGO: Record<string, string> = {
  STOCK_BAJO: 'Stock bajo',
  STOCK_JUSTO: 'Stock justo',
  CONSUMO_EXCEDIDO: 'Consumo excedido',
  SALIDA_SIN_STOCK: 'Salida sin stock',
  CONSUMO_ATIPICO: 'Consumo atípico',
};

/** Nombre del tipo de hallazgo para la persona; si no se conoce, el código tal cual. */
export function textoTipoHallazgo(tipo: string): string {
  return TIPO_HALLAZGO[tipo] ?? tipo;
}

const CAMPOS_SUGERENCIA = `
  id
  ejecucionId
  agente
  obraId
  obraNombre
  accion
  accionTexto
  descripcion
  estado
  creadaEn
`;

export interface VariablesControlMateriales {
  agente: Agente;
  obraId: string;
  estado: EstadoSugerencia;
}

/**
 * Hallazgos vigentes y sugerencias pendientes del agente de materiales en la obra, en una sola petición: si el
 * servicio de IA no responde, las dos fallan juntas con SERVICIO_NO_DISPONIBLE (son listas no nulas).
 */
export const CONTROL_MATERIALES: TypedDocumentNode<
  { hallazgos: Hallazgo[]; sugerencias: Sugerencia[] },
  VariablesControlMateriales
> = gql`
  query ControlMateriales($agente: Agente!, $obraId: ID!, $estado: EstadoSugerencia!) {
    hallazgos(agente: $agente, obraId: $obraId) {
      ejecucionId
      agente
      obraId
      obraNombre
      tipo
      severidad
      situacion
      causaProbable
      evidencia {
        herramienta
        dato
      }
      detectadoEn
    }
    sugerencias(agente: $agente, obraId: $obraId, estado: $estado) {
      ${CAMPOS_SUGERENCIA}
    }
  }
`;

/** Variables de la consulta del panel para una obra. */
export function variablesControlMateriales(obraId: string): VariablesControlMateriales {
  return { agente: AGENTE_MATERIALES, obraId, estado: 'PENDIENTE' };
}

export function useControlMateriales(obraId: string) {
  return useConsultaConRespaldo(CONTROL_MATERIALES, { variables: variablesControlMateriales(obraId) });
}
