import { z } from 'zod';
import { COMENTARIO_MAXIMO, MOTIVO_MAXIMO, MOTIVO_MINIMO } from './agentes.graphql';

// Decidir una sugerencia (502, criterios 12 y 13): al aprobar, comentario opcional de hasta 300 caracteres; al
// rechazar, motivo obligatorio de 10 a 500. Se cuentan sin los espacios de los extremos (se envía recortado).

export const MENSAJE_MOTIVO = `El motivo debe tener entre ${MOTIVO_MINIMO} y ${MOTIVO_MAXIMO} caracteres.`;
export const MENSAJE_COMENTARIO = `El comentario puede tener hasta ${COMENTARIO_MAXIMO} caracteres.`;

export const esquemaAprobar = z.object({
  texto: z.string().trim().max(COMENTARIO_MAXIMO, MENSAJE_COMENTARIO),
});

export const esquemaRechazar = z.object({
  texto: z.string().trim().min(MOTIVO_MINIMO, MENSAJE_MOTIVO).max(MOTIVO_MAXIMO, MENSAJE_MOTIVO),
});
