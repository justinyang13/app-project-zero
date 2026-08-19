export interface Project {
  id: string;
  name: string;
  tagline: string;
  description: string;
  tags: string[];
  /** Relative link to the standalone app's own deployed page. */
  href: string;
  linkLabel: string;
}

export const projects: Project[] = [
  {
    id: "hello-world",
    name: "Hello World",
    tagline: "Full-stack GraphQL reference app",
    description:
      "React + TypeScript client talking to a .NET GraphQL API, built as a Clean Architecture template for future projects.",
    tags: ["React", "TypeScript", ".NET", "GraphQL"],
    href: "app-hello-world/",
    linkLabel: "Open demo",
  },
  {
    id: "note-ninja",
    name: "Note Ninja",
    tagline: "Ear-training game for piano-playing kids",
    description:
      "Listen to a note and guess which one it is, solo or head-to-head with two players. Three difficulty levels.",
    tags: ["JavaScript", "Web Audio"],
    href: "app-note-ninja/",
    linkLabel: "Play game",
  },
  {
    id: "pool-party-forecast",
    name: "Pool Party Forecast",
    tagline: "Is it pool weather? Just ask.",
    description:
      "Search a location and date and get a green/yellow/red verdict from live or historical weather data — no signup, no API key.",
    tags: ["JavaScript", "Open-Meteo API"],
    href: "app-pool-party-forecast/",
    linkLabel: "Check forecast",
  },
];
