import { gql, type TypedDocumentNode } from '@apollo/client';
import { useMutation } from '@apollo/client/react';
import { useConsultaConRespaldo } from '../nucleo/consulta-respaldo';
import type { EstadoStock } from './estado-stock';

// Operaciones del stock por obra (docs/contratos.md: obras, stockObra, definirStockMinimo).

export interface ObraOpcion {
  id: string;
  nombre: string;
}

export interface StockMaterial {
  materialId: string;
  codigo: string;
  nombre: string;
  unidad: string;
  unidadPlural: string;
  cantidad: number;
  minimo: number;
  estado: EstadoStock;
}

/** Obras que ve el usuario (Obras filtra: los residentes solo ven las asignadas, criterio 8). */
export const OBRAS: TypedDocumentNode<{ obras: ObraOpcion[] }, Record<string, never>> = gql`
  query ObrasParaStock {
    obras {
      id
      nombre
    }
  }
`;

const CAMPOS_STOCK = 'materialId codigo nombre unidad unidadPlural cantidad minimo estado';

export const STOCK_OBRA: TypedDocumentNode<{ stockObra: StockMaterial[] }, { obraId: string }> = gql`
  query StockObra($obraId: ID!) {
    stockObra(obraId: $obraId) { ${CAMPOS_STOCK} }
  }
`;

export const DEFINIR_STOCK_MINIMO: TypedDocumentNode<
  { definirStockMinimo: StockMaterial },
  { obraId: string; materialId: string; minimo: number }
> = gql`
  mutation DefinirStockMinimo($obraId: ID!, $materialId: ID!, $minimo: Float!) {
    definirStockMinimo(obraId: $obraId, materialId: $materialId, minimo: $minimo) { ${CAMPOS_STOCK} }
  }
`;

// Las consultas de la pantalla se guardan en el equipo y, sin conexión, se muestra lo guardado (104);
// el selector de obra también, para poder elegir sin conexión una obra ya consultada.
export function useObras() {
  return useConsultaConRespaldo(OBRAS);
}

export function useStockObra(obraId: string | undefined) {
  return useConsultaConRespaldo(STOCK_OBRA, { variables: { obraId: obraId ?? '' }, omitir: !obraId });
}

/** Fijar el mínimo vuelve a pedir el stock de la obra (puede aparecer una fila nueva con cantidad 0). */
export function useDefinirMinimo() {
  return useMutation(DEFINIR_STOCK_MINIMO, { refetchQueries: ['StockObra'] });
}
