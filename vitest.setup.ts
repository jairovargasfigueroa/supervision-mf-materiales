// jsdom no implementa scrollTo; el router lo llama al cambiar de ruta.
window.scrollTo = () => {};
