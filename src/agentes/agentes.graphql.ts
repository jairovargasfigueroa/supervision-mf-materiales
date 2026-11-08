import { gql, type TypedDocumentNode } from '@apollo/client';
import { useMutation } from '@apollo/client/react';
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

/** Largos de la decisión (502, criterios 12 y 13). */
export const COMENTARIO_MAXIMO = 300;
export const MOTIVO_MINIMO = 10;
export const MOTIVO_MAXIMO = 500;

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

/** Aprobar solo registra la decisión (502, criterio 12): no se crea ni envía nada en otro servicio. */
export const APROBAR_SUGERENCIA: TypedDocumentNode<
  { aprobarSugerencia: Sugerencia },
  { id: string; comentario?: string }
> = gql`
  mutation AprobarSugerencia($id: ID!, $comentario: String) {
    aprobarSugerencia(id: $id, comentario: $comentario) {
      ${CAMPOS_SUGERENCIA}
    }
  }
`;

export const RECHAZAR_SUGERENCIA: TypedDocumentNode<{ rechazarSugerencia: Sugerencia }, { id: string; motivo: string }> = gql`
  mutation RechazarSugerencia($id: ID!, $motivo: String!) {
    rechazarSugerencia(id: $id, motivo: $motivo) {
      ${CAMPOS_SUGERENCIA}
    }
  }
`;

export function useAprobarSugerencia() {
  return useMutation(APROBAR_SUGERENCIA);
}

export function useRechazarSugerencia() {
  return useMutation(RECHAZAR_SUGERENCIA);
}
