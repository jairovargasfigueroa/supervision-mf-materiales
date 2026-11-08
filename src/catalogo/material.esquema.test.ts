import { describe, expect, it } from 'vitest';
import { entradaDesdeMaterial, type Material } from './catalogo.graphql';
import {
  entradaDesdeValores,
  esquemaMaterial,
  leerPrecio,
  valoresDesdeMaterial,
  VALORES_NUEVO,
} from './material.esquema';

const MATERIAL: Material = {
  id: 'm1',
  codigo: 'CEM-IP30',
  nombre: 'Cemento IP-30',
  tipo: 'CEMENTO',
  unidad: 'bolsa',
  unidadPlural: 'bolsas',
  precioReferencial: 62,
  activo: true,
  atributos: [{ nombre: 'peso', valor: '50 kg' }],
};

const mensajes = (valores: unknown) => {
  const resultado = esquemaMaterial.safeParse(valores);
  return resultado.success ? {} : Object.fromEntries(resultado.error.issues.map((i) => [i.path.join('.'), i.message]));
};

describe('esquema de material (criterio 3)', () => {
  it('exige código, nombre, unidades y precio', () => {
    expect(mensajes(VALORES_NUEVO)).toEqual({
      codigo: 'Obligatorio',
      nombre: 'Obligatorio',
      unidad: 'Obligatorio',
      unidadPlural: 'Obligatorio',
      precioReferencial: 'Obligatorio',
    });
  });

  it('limita el código a 20 y el nombre a 120 caracteres', () => {
    const valores = { ...valoresDesdeMaterial(MATERIAL), codigo: 'X'.repeat(21), nombre: 'N'.repeat(121) };
    expect(mensajes(valores)).toEqual({ codigo: 'Máximo 20 caracteres', nombre: 'Máximo 120 caracteres' });
    expect(mensajes({ ...valores, codigo: 'X'.repeat(20), nombre: 'N'.repeat(120) })).toEqual({});
  });

  it('el precio debe ser un número ≥ 0 (acepta coma decimal)', () => {
    const base = valoresDesdeMaterial(MATERIAL);
    expect(mensajes({ ...base, precioReferencial: '-1' })).toEqual({
      precioReferencial: 'Debe ser un número mayor o igual a 0',
    });
    expect(mensajes({ ...base, precioReferencial: 'abc' })).toHaveProperty('precioReferencial');
    expect(mensajes({ ...base, precioReferencial: '0' })).toEqual({});
    expect(leerPrecio('62,50')).toBe(62.5);
  });

  it('el tipo es uno de la lista y cada atributo necesita nombre y valor', () => {
    const base = valoresDesdeMaterial(MATERIAL);
    expect(mensajes({ ...base, tipo: 'VIDRIO' })).toEqual({ tipo: 'Elige un tipo' });
    expect(mensajes({ ...base, atributos: [{ nombre: 'resistencia', valor: ' ' }] })).toEqual({
      'atributos.0.valor': 'Escribe el valor',
    });
  });
});

describe('entradas', () => {
  it('normaliza el código a mayúsculas sin espacios y convierte el precio', () => {
    const valores = { ...valoresDesdeMaterial(MATERIAL), codigo: '  cem-ip30 ', precioReferencial: '62,5' };
    expect(entradaDesdeValores(valores)).toEqual({
      codigo: 'CEM-IP30',
      nombre: 'Cemento IP-30',
      tipo: 'CEMENTO',
      unidad: 'bolsa',
      unidadPlural: 'bolsas',
      precioReferencial: 62.5,
      atributos: [{ nombre: 'peso', valor: '50 kg' }],
    });
  });

  it('al editar conserva activo; al desactivar manda el material completo con activo false', () => {
    expect(entradaDesdeValores(valoresDesdeMaterial(MATERIAL), false).activo).toBe(false);
    expect(entradaDesdeMaterial(MATERIAL, { activo: false })).toEqual({
      codigo: 'CEM-IP30',
      nombre: 'Cemento IP-30',
      tipo: 'CEMENTO',
      unidad: 'bolsa',
      unidadPlural: 'bolsas',
      precioReferencial: 62,
      activo: false,
      atributos: [{ nombre: 'peso', valor: '50 kg' }],
    });
  });
});
