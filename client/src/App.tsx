import { Provider } from "urql";
import { urqlClient } from "./graphqlClient";
import { Greeting } from "./Greeting";
import "./App.css";

function App() {
  return (
    <Provider value={urqlClient}>
      <main>
        <Greeting />
      </main>
    </Provider>
  );
}

export default App;
