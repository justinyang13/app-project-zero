export interface Project {
  id: string;
  name: string;
  tagline: string;
  description: string;
  tags: string[];
  /** Internal route within this app, if the project is embedded here. */
  internalPath?: string;
  /** External link (deployed site, static asset, or repo), if not embedded. */
  externalHref?: string;
  linkLabel: string;
}

export const projects: Project[] = [
  {
    id: "project-zero",
    name: "Project Zero",
    tagline: "Full-stack Hello World reference app",
    description:
      "React + TypeScript client talking to a .NET GraphQL API, built as a Clean Architecture template for future projects.",
    tags: ["React", "TypeScript", ".NET", "GraphQL"],
    internalPath: "/project-zero",
    linkLabel: "Open demo",
  },
  {
    id: "note-ninjas",
    name: "Note Ninjas",
    tagline: "Ear-training game for piano-playing kids",
    description:
      "Listen to a note and guess which one it is, solo or head-to-head with two players. Three difficulty levels.",
    tags: ["JavaScript", "Web Audio"],
    externalHref: `${import.meta.env.BASE_URL}note-ninjas/index.html`,
    linkLabel: "Play game",
  },
];
