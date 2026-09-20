import type { MountHint } from "../core/mountHint";

/** The action's wording, without the "Press E to" / "Tap to" lead-in. */
function action(hint: MountHint): string {
  switch (hint.kind) {
    case "exit-vehicle":
      return "exit vehicle";
    case "dismount":
      return "dismount";
    case "drive":
      return "drive";
    case "ride":
      return `ride the ${hint.name}`;
  }
}

/** Keyboard players are told which key; touch players get the prompt as the button itself. */
export function describeMountHint(hint: MountHint, input: "key" | "tap"): string {
  return `${input === "key" ? "Press E to" : "Tap to"} ${action(hint)}`;
}
