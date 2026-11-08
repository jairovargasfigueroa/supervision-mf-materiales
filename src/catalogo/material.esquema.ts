import { z } from 'zod';
import { TIPOS_MATERIAL, type Material, type MaterialEntrada } from './catalogo.graphql';

// Reglas del formulario de material (003, criterio 3). Materiales vuelve a validarlas y normaliza el código.

const obligatorio = 'Obligatorio';

/** Texto de precio a número: acepta coma o punto decimal. `NaN` si no es un número. */
export function leerPrecio(texto: string): number {
  const limpio = texto.trim().replace(',', '.');
  return limpio === '' ? Number.NaN : Number(limpio);
}

export const esquemaMaterial = z.object({
  codigo: z.string().trim().min(1, obligatorio).max(20, 'Máximo 20 caracteres'),
  nombre: z.string().trim().min(1, obligatorio).max(120, 'Máximo 120 caracteres'),
  tipo: z.enum(TIPOS_MATERIAL, { error: 'Elige un tipo' }),
  unidad: z.string().trim().min(1, obligatorio),
  unidadPlural: z.string().trim().min(1, obligatorio),
  precioReferencial: z
    .string()
    .trim()
    .min(1, { error: obligatorio, abort: true })
    .refine((v) => Number.isFinite(leerPrecio(v)) && leerPrecio(v) >= 0, 'Debe ser un número mayor o igual a 0'),
  atributos: z.array(
    z.object({
      nombre: z.string().trim().min(1, 'Escribe el nombre del atributo'),
      valor: z.string().trim().min(1, 'Escribe el valor'),
    }),
  ),
});

export type ValoresMaterial = z.input<typeof esquemaMaterial>;

export const VALORES_NUEVO: ValoresMaterial = {
  codigo: '',
  nombre: '',
  tipo: 'CEMENTO',
  unidad: '',
  unidadPlural: '',
  precioReferencial: '',
  atributos: [],
};

/** Valores del formulario para editar un material del catálogo. */
export function valoresDesdeMaterial(material: Material): ValoresMaterial {
  return {
    codigo: material.codigo,
    nombre: material.nombre,
    tipo: material.tipo,
    unidad: material.unidad,
    unidadPlural: material.unidadPlural,
    precioReferencial: String(material.precioReferencial),
    atributos: material.atributos.map(({ nombre, valor }) => ({ nombre, valor })),
  };
}

/** Código tal como lo guarda Materiales: sin espacios a los costados y en mayúsculas. */
export function normalizarCodigo(codigo: string): string {
  return codigo.trim().toUpperCase();
}

/** Entrada GraphQL desde los valores del formulario; `activo` se conserva al editar. */
export function entradaDesdeValores(valores: ValoresMaterial, activo?: boolean): MaterialEntrada {
  return {
    codigo: normalizarCodigo(valores.codigo),
    nombre: valores.nombre.trim(),
    tipo: valores.tipo as MaterialEntrada['tipo'],
    unidad: valores.unidad.trim(),
    unidadPlural: valores.unidadPlural.trim(),
    precioReferencial: leerPrecio(valores.precioReferencial),
    ...(activo === undefined ? {} : { activo }),
    atributos: valores.atributos.map((a) => ({ nombre: a.nombre.trim(), valor: a.valor.trim() })),
  };
}
