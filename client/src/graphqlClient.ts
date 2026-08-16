import { Client, cacheExchange, fetchExchange } from "urql";

// Build-time env var so the same bundle can target a local API in dev
// and the deployed Render API in the GitHub Pages build. Never hardcoded.
// `|| default` (not `??`) because an unset GitHub Actions variable still
// comes through as an empty string, not undefined.
const graphqlUrl = import.meta.env.VITE_GRAPHQL_URL || "http://localhost:5043/graphql";

export const urqlClient = new Client({
  url: graphqlUrl,
  exchanges: [cacheExchange, fetchExchange],
  // GraphQL.NET's CSRF guard requires either POST or a preflight header on
  // GET requests; urql defaults queries to GET, so force POST instead.
  preferGetMethod: false,
});
