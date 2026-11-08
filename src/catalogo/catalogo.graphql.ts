import { gql, type TypedDocumentNode } from '@apollo/client';
import { useMutation } from '@apollo/client/react';
import { useConsultaConRespaldo } from '../nucleo/consulta-respaldo';

// Operaciones del catálogo (docs/contratos.md: materiales, crearMaterial, actualizarMaterial).

export const TIPOS_MATERIAL = [
  'CEMENTO',
  'ACERO',
  'AGREGADO',
  'LADRILLO',
  'MADERA',
  'ELECTRICO',
  'SANITARIO',
  'PINTURA',
  'OTRO',
] as const;

export type TipoMaterial = (typeof TIPOS_MATERIAL)[number];

/** Nombre del tipo para mostrar (el valor del enum va al gateway). */
export const NOMBRE_TIPO: Record<TipoMaterial, string> = {
  CEMENTO: 'Cemento',
  ACERO: 'Acero',
  AGREGADO: 'Agregado',
  LADRILLO: 'Ladrillo',
  MADERA: 'Madera',
  ELECTRICO: 'Eléctrico',
  SANITARIO: 'Sanitario',
  PINTURA: 'Pintura',
  OTRO: 'Otro',
};

export interface Atributo {
  nombre: string;
  valor: string;
}

export interface Material {
  id: string;
  codigo: string;
  nombre: string;
  tipo: TipoMaterial;
  unidad: string;
  unidadPlural: string;
  precioReferencial: number;
  activo: boolean;
  atributos: Atributo[];
}

export interface MaterialEntrada {
  codigo: string;
  nombre: string;
  tipo: TipoMaterial;
  unidad: string;
  unidadPlural: string;
  precioReferencial: number;
  activo?: boolean;
  atributos: Atributo[];
}

interface MaterialesDatos {
  materiales: { items: Material[]; total: number; pagina: number; tamano: number };
}

interface MaterialesVariables {
  busqueda?: string;
  soloActivos?: boolean;
  pagina?: number;
  tamano?: number;
}

const CAMPOS_MATERIAL = `
  id codigo nombre tipo unidad unidadPlural precioReferencial activo
  atributos { nombre valor }
`;

export const MATERIALES: TypedDocumentNode<MaterialesDatos, MaterialesVariables> = gql`
  query Materiales($busqueda: String, $soloActivos: Boolean, $pagina: Int, $tamano: Int) {
    materiales(busqueda: $busqueda, soloActivos: $soloActivos, pagina: $pagina, tamano: $tamano) {
      items { ${CAMPOS_MATERIAL} }
      total
      pagina
      tamano
    }
  }
`;

export const CREAR_MATERIAL: TypedDocumentNode<{ crearMaterial: Material }, { entrada: MaterialEntrada }> = gql`
  mutation CrearMaterial($entrada: MaterialEntrada!) {
    crearMaterial(entrada: $entrada) { ${CAMPOS_MATERIAL} }
  }
`;

export const ACTUALIZAR_MATERIAL: TypedDocumentNode<
  { actualizarMaterial: Material },
  { id: string; entrada: MaterialEntrada }
> = gql`
  mutation ActualizarMaterial($id: ID!, $entrada: MaterialEntrada!) {
    actualizarMaterial(id: $id, entrada: $entrada) { ${CAMPOS_MATERIAL} }
  }
`;

/**
 * Catálogo paginado; mientras llega la página nueva se sigue mostrando la anterior. Cada página se guarda en
 * el equipo y, sin conexión, se muestra la guardada (104).
 */
export function useMateriales(variables: MaterialesVariables, opciones: { omitir?: boolean } = {}) {
  const consulta = useConsultaConRespaldo(MATERIALES, {
    variables,
    omitir: opciones.omitir,
    notifyOnNetworkStatusChange: true,
  });
  const pagina = consulta.data?.materiales ?? consulta.previousData?.materiales;
  return { ...consulta, pagina };
}

/** Crear y actualizar vuelven a pedir el catálogo para que la lista quede al día. */
export function useGuardarMaterial() {
  const [crear, estadoCrear] = useMutation(CREAR_MATERIAL, { refetchQueries: ['Materiales'] });
  const [actualizar, estadoActualizar] = useMutation(ACTUALIZAR_MATERIAL, { refetchQueries: ['Materiales'] });
  return { crear, actualizar, guardando: estadoCrear.loading || estadoActualizar.loading };
}

/** Entrada completa de un material ya guardado (para activar o desactivar sin tocar lo demás). */
export function entradaDesdeMaterial(material: Material, cambios: Partial<MaterialEntrada> = {}): MaterialEntrada {
  return {
    codigo: material.codigo,
    nombre: material.nombre,
    tipo: material.tipo,
    unidad: material.unidad,
    unidadPlural: material.unidadPlural,
    precioReferencial: material.precioReferencial,
    activo: material.activo,
    atributos: material.atributos.map(({ nombre, valor }) => ({ nombre, valor })),
    ...cambios,
  };
}
