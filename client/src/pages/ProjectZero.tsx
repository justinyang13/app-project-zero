import { Provider } from "urql";
import { urqlClient } from "../graphqlClient";
import { Greeting } from "../Greeting";
import "../App.css";

export function ProjectZero() {
  return (
    <Provider value={urqlClient}>
      <main className="greeting">
        <Greeting />
      </main>
    </Provider>
  );
}
