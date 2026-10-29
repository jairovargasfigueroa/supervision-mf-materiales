import { ApolloClient, ApolloLink, HttpLink, InMemoryCache } from '@apollo/client';
import { SetContextLink } from '@apollo/client/link/context';
import { obtenerGatewayUrl } from './configuracion';
import { obtenerToken } from './sesion';

// Cliente GraphQL del microfrontend: solo habla con el gateway. El token lo da el shell
// (obtenerToken() lo renueva si está por vencer); el microfrontend nunca habla con Keycloak.

/** Agrega `Authorization: Bearer <token>` a cada operación con el token vigente del shell. */
export const enlaceToken = new SetContextLink(async (contextoAnterior) => {
  const token = await obtenerToken();
  return { headers: { ...contextoAnterior.headers, authorization: `Bearer ${token}` } };
});

export function crearCache(): InMemoryCache {
  return new InMemoryCache({
    typePolicies: {
      // Una fila de stock no tiene id propio y el mismo material aparece en varias obras:
      // se guarda dentro de su consulta (sin normalizar) para no mezclar obras.
      StockMaterial: { keyFields: false },
      Atributo: { keyFields: false },
    },
  });
}

export function crearClienteApollo(enlaceHttp: ApolloLink = new HttpLink({ uri: () => obtenerGatewayUrl() })) {
  return new ApolloClient({
    link: ApolloLink.from([enlaceToken, enlaceHttp]),
    cache: crearCache(),
    defaultOptions: { watchQuery: { fetchPolicy: 'cache-and-network' } },
  });
}

let cliente: ApolloClient | undefined;

/** Cliente único del microfrontend (se crea al primer uso). */
export function obtenerClienteApollo(): ApolloClient {
  cliente ??= crearClienteApollo();
  return cliente;
}
