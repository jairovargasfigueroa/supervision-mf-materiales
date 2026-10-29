import { configure } from '@testing-library/react';

// jsdom no implementa scrollTo; el router lo llama al cambiar de ruta.
window.scrollTo = () => {};

// Los formularios con varios campos y Apollo simulado pueden tardar más de 1 s en una máquina cargada.
configure({ asyncUtilTimeout: 3000 });
