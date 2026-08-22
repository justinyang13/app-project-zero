import { useMemo } from "react";
import { Provider } from "urql";
import { urqlClient } from "./graphqlClient";
import { Greeting } from "./Greeting";
import { SpaceBackground } from "./components/SpaceBackground";
import { AstronautKitten, type AstronautKittenProps } from "./components/AstronautKitten";
import { pickRandomHelloStyle } from "./randomHelloStyle";
import "./App.css";

const KITTENS: AstronautKittenProps[] = [
  { top: "10%", left: "8%", size: 92, duration: 7, delay: 0 },
  { top: "16%", left: "78%", size: 66, duration: 9, delay: 1.4, flip: true },
  { top: "66%", left: "10%", size: 58, duration: 8.5, delay: 0.6, flip: true },
  { top: "70%", left: "74%", size: 82, duration: 10, delay: 2.1 },
  { top: "42%", left: "88%", size: 52, duration: 6.5, delay: 0.3, flip: true },
];

function App() {
  // Re-picked on every mount (i.e. every page load), not on every render.
  const helloStyle = useMemo(() => pickRandomHelloStyle(), []);
  const heroVars = {
    "--hello-font": helloStyle.fontFamily,
    "--hello-angle": `${helloStyle.gradientAngle}deg`,
    "--hello-c1": helloStyle.colors[0],
    "--hello-c2": helloStyle.colors[1],
    "--hello-c3": helloStyle.colors[2],
  } as React.CSSProperties;

  return (
    <Provider value={urqlClient}>
      <main className="greeting">
        <SpaceBackground />
        {KITTENS.map((kitten, index) => (
          <AstronautKitten key={index} {...kitten} />
        ))}
        <div className="hello-stage" style={heroVars}>
          <Greeting />
        </div>
      </main>
    </Provider>
  );
}

export default App;
