import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createMemoryHistory } from '@tanstack/react-router';
import { App } from './App';

afterEach(() => {
  cleanup();
  delete window.plataforma;
});

function conSesion() {
  window.plataforma = {
    sesion: {
      usuario: { id: 'u1', nombre: 'Ana', roles: ['admin'] },
      obtenerToken: vi.fn().mockResolvedValue('t'),
      cerrarSesion: vi.fn(),
    },
    configuracion: { gatewayUrl: 'http://localhost:4000/graphql' },
  };
}

describe('App', () => {
  it('pide abrir la pantalla desde el ERP si no hay sesión del shell', () => {
    render(<App />);
    expect(screen.getByText('Abre esta pantalla desde el ERP')).toBeTruthy();
    expect(screen.queryByRole('heading')).toBeNull();
  });

  it('/materiales lleva al catálogo', async () => {
    conSesion();
    const historial = createMemoryHistory({ initialEntries: ['/materiales'] });
    render(<App historial={historial} />);

    expect(await screen.findByRole('heading', { name: 'Materiales' })).toBeTruthy();
    expect(await screen.findByRole('tab', { name: 'Catálogo', selected: true })).toBeTruthy();
    expect(historial.location.pathname).toBe('/materiales/catalogo');
  });

  it('/materiales/stock abre el stock y las pestañas navegan entre secciones', async () => {
    conSesion();
    const historial = createMemoryHistory({ initialEntries: ['/materiales/stock'] });
    render(<App historial={historial} />);

    expect(await screen.findByRole('tab', { name: 'Stock por obra', selected: true })).toBeTruthy();
    fireEvent.click(screen.getByRole('tab', { name: 'Catálogo' }));
    expect(await screen.findByRole('tab', { name: 'Catálogo', selected: true })).toBeTruthy();
    expect(historial.location.pathname).toBe('/materiales/catalogo');
  });

  it('una ruta desconocida muestra el aviso con el enlace al catálogo', async () => {
    conSesion();
    const historial = createMemoryHistory({ initialEntries: ['/materiales/otra'] });
    render(<App historial={historial} />);

    fireEvent.click(await screen.findByRole('button', { name: 'Ir al catálogo' }));
    expect(await screen.findByRole('tab', { name: 'Catálogo', selected: true })).toBeTruthy();
  });
});
