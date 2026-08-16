import { Provider } from "urql";
import { urqlClient } from "../graphqlClient";
import { Greeting } from "../Greeting";
import { SpaceBackground } from "../components/SpaceBackground";
import { AstronautKitten, type AstronautKittenProps } from "../components/AstronautKitten";
import "../App.css";

const KITTENS: AstronautKittenProps[] = [
  { top: "10%", left: "8%", size: 92, duration: 7, delay: 0 },
  { top: "16%", left: "78%", size: 66, duration: 9, delay: 1.4, flip: true },
  { top: "66%", left: "10%", size: 58, duration: 8.5, delay: 0.6, flip: true },
  { top: "70%", left: "74%", size: 82, duration: 10, delay: 2.1 },
  { top: "42%", left: "88%", size: 52, duration: 6.5, delay: 0.3, flip: true },
];

export function ProjectZero() {
  return (
    <Provider value={urqlClient}>
      <main className="greeting">
        <SpaceBackground />
        {KITTENS.map((kitten, index) => (
          <AstronautKitten key={index} {...kitten} />
        ))}
        <div className="hello-stage">
          <Greeting />
        </div>
      </main>
    </Provider>
  );
}
