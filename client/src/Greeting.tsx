import { useQuery } from "urql";

const HELLO_QUERY = `
  query Hello {
    hello
  }
`;

interface HelloQueryResult {
  hello: string;
}

export function Greeting() {
  const [result] = useQuery<HelloQueryResult>({ query: HELLO_QUERY });
  const { data, fetching, error } = result;

  if (fetching) {
    return <p role="status">Loading greeting…</p>;
  }

  if (error) {
    return <p role="alert">Failed to load greeting: {error.message}</p>;
  }

  return <h1>{data?.hello}</h1>;
}
