# 12 — UI/UX

All UI is implemented in React (see
[01 — Tech Stack & Architecture](01-tech-stack-architecture.md) §1–3),
reading from Zustand stores that the game loop pushes throttled updates
into. This chapter enumerates every screen and HUD element.

## 1. Main menu

First screen on load. Options: **Continue** (loads the most recently
played world directly, only shown if a save exists), **Worlds** (goes to
the World Select screen, §2), **Settings** (§10), **How to Play** (a
static in-app reference panel summarizing controls and basic loop, not a
tutorial sequence — see §11), version/build number in a corner. Background
is a slowly rotating Photo-Mode-style render of a procedurally generated
showcase scene (not the player's actual world) built at app load time
from a fixed showcase seed.

## 2. World Select / Creation screen

- **World list:** cards showing each saved world's name, a thumbnail
  (rendered from the player's last logged position/orientation at last
  save, cached to IndexedDB — see [14](14-persistence-saves.md) §3), last-
  played date, world type, and play-time. Actions per card: Play, Rename,
  Duplicate (clones the save under a new name/id, useful for experimenting
  without risking the original), Export, Delete (confirmation modal
  required).
- **Create New World** panel: Name (auto-suggested, editable), Seed
  (optional text field, blank = random — see
  [02](02-world-generation.md) §8), World Type (Standard/Superflat/
  Amplified/Islands, with Extended Depth toggle — see
  [02](02-world-generation.md) §7), Game Mode (Creative/Survival/
  Adventure/Spectator — see [17](17-game-modes-progression.md) §1),
  Difficulty (§7 of chapter 07), and an Advanced section (Superflat layer
  editor, structure-generation toggle, starting-inventory preset for
  Creative). Confirm creates the save record and transitions straight
  into gameplay at the generated spawn point.

## 3. In-world HUD (always-visible layer)

- **Hotbar** (bottom-center, 9 slots) with the selected slot highlighted;
  Survival Mode additionally overlays each tool/weapon slot's durability
  as a thin colored bar under the icon once below full.
- **Health bar** (bottom-left, 10 heart icons, half-heart granularity,
  hidden entirely in Creative/Peaceful-with-no-hunger... actually hidden
  only in Creative Mode and Spectator; shown but static/full in Peaceful).
- **Hunger bar** (bottom-right, mirrored heart-style icon row using a
  drumstick/food icon), hidden in Creative/Spectator/Peaceful.
- **Stamina bar** (small, above hunger, only rendered while actively
  draining/recovering — fades out when full, see
  [05](05-player-mechanics.md) §3), hidden in Creative/Peaceful.
- **Breath bubbles** (appears only while underwater and oxygen is
  draining, see [07](07-survival-systems.md) §5).
- **Crosshair** (center), changes shape subtly when hovering an
  interactable (container, door, creature) vs. a plain block.
- **Active effect icons** (top-left): small icon row for currently active
  Tonic effects/status conditions (Chilled, Overheated, Burning, etc.,
  see [07](07-survival-systems.md) §5), each with a countdown-timer
  sliver.
- **Held-item / block-break progress** (crosshair-adjacent radial or bar
  indicator while breaking a block, see [03](03-blocks-materials.md) §4).
- **Vignette/damage flash** (screen-edge red pulse on taking damage; a
  darker cold-tint vignette while Chilled; togglable in Accessibility
  settings, see [16](16-controls-accessibility.md) §4).

## 4. Inventory screen

Opened via the default `E` key. Shows: the 3×3 general inventory grid (27
slots) above the hotbar row, the 4 armor slots + 1 off-hand slot on the
left, a small player model preview in the center-left showing currently
worn armor, and (when opened without a station nearby) the 2×2 quick-craft
grid on the right with its output slot. Drag-and-drop between slots
(mouse) or a tap-to-pick-up/tap-to-place model (touch, see
[16](16-controls-accessibility.md) §2); shift-click to quick-move a stack
to/from the hotbar; a search/filter bar at the top for large inventories.

## 5. Creative inventory

Replaces the general-inventory grid with a category-tabbed, scrollable,
searchable palette of every block/item in the game (unlimited supply —
clicking places one copy in the cursor, doesn't remove from a finite
source). Categories: Terrain, Stone & Ore, Wood, Plants, Functional,
Decorative, Logic, Food, Tools & Combat, Misc. A dedicated "Inventory"
sub-tab shows the player's actual carried items (for organizing what's
been manually collected/dragged out) separately from the infinite
palette.

## 6. Station UIs

- **Workbench:** 3×3 crafting grid + output slot + Recipe Book panel (see
  [04](04-items-inventory-crafting.md) §4), player's own inventory grid
  always visible below for drag-source convenience.
- **Hearth Furnace / Blast Hearth:** input slot, fuel slot (with a small
  flame-level indicator that depletes as fuel burns), output slot, and an
  animated progress arrow between input and output.
- **Alchemy Basin:** 3 output-bottle slots, 1 base-reagent slot, 1
  ingredient slot, a bubbling-animation progress indicator.
- **Anvil Stone:** two input slots (item to repair/combine + repair
  material or second item) and a rename text field, with a preview of the
  resulting durability/name and any Insight cost.
- **Storage Crate / Chest / Barrel:** container grid (27 or 54 slots)
  alongside the player's own inventory; a "Quick Stack" button moves
  matching-type items from the player's inventory into the container in
  one click.
- **Mason's Wand toolbar** (Creative only, see
  [06](06-building-tools.md) §2.1): a floating radial or side panel
  listing Fill/Replace/Hollow/Outline/Clear/Copy/Cut/Paste/Move, active
  only while the Wand is held and a selection exists.
- **Blueprint Library:** a grid of saved Blueprints with thumbnails, name/
  rename, Export/Import/Delete actions, and a "Bind to Scroll" action that
  assigns the selected Blueprint to whichever Blueprint Scroll item is
  currently held.

## 7. Pause menu

Opened via `Esc`. Options: Resume, Settings (§10), Photo Mode (see
[06](06-building-tools.md) §4), Save & Quit to Title, and (single-player,
no multiplayer concerns) a direct **Save Now** button for players who
want an explicit checkpoint beyond autosave (see
[14](14-persistence-saves.md) §3). Game simulation pauses fully while this
menu is open (single-player has no reason to keep ticking in the
background — unlike a hypothetical multiplayer server).

## 8. Map & navigation

- **Minimap** (optional HUD element, togglable, top-right corner): a
  small top-down rendering of explored terrain around the player, north-
  oriented or player-rotating per a settings toggle.
- **Full Map screen:** opened via a dedicated key while holding a
  crafted Map item; shows the larger explored region at a pannable/
  zoomable scale, with player position and any placed Signpost labels
  marked. Maps are generated per-region from a Cartography Table (see
  [03](03-blocks-materials.md) §2.6) and only reveal terrain the player
  has actually explored (fog-of-war style reveal, tracked per map
  instance).
- **Wayfinder (compass-equivalent) HUD ring:** an optional always-on
  compass ring at the top of the screen showing cardinal direction and,
  if the Wayfinder item is bound to a specific location (right-click a
  block with it to set), a directional arrow toward that point.

## 9. Settings screens

Tabbed: **Video** (render distance, FOV, brightness/gamma, VSync/FPS cap,
particle density, shadow quality, anti-aliasing toggle), **Audio** (master/
music/ambient/SFX sliders independently, see
[13 — Audio](13-audio.md) §3), **Controls** (full rebindable keymap, mouse
sensitivity/acceleration, invert-Y toggle — see
[16 — Controls & Accessibility](16-controls-accessibility.md) §1),
**Accessibility** (§4 of chapter 16), **Gameplay** (auto-mine-similar
toggle, sneak-edge-safety toggle, dynamic-FOV toggle, chat/console
autocomplete), and **Storage** (shows local IndexedDB usage, exposes
per-world Export/Delete, and a "Clear All Local Data" nuclear option with
strong confirmation).

## 10. Debug overlay

Toggled via a dedicated key (default `F3`, matching genre convention).
Shows: FPS, frame time breakdown (sim/mesh/render), player exact
coordinates + facing direction + targeted block coordinate and type,
current biome, current light level (block/sky, separately), chunk load/
mesh queue depth, loaded chunk count, entity count, world seed, and
simulation tick number. Intended for the player's own curiosity/
debugging, not gated behind any unlock.

## 11. First-time onboarding

No forced tutorial sequence or blocking dialogue (per
[00 — Vision & Scope](00-vision-and-scope.md) §4 — no NPC dialogue
systems). Instead: on a brand-new Survival world's very first session, a
small set of unobtrusive, dismissible toast-style hints appear tied to
context (first block broken → "Right-click to place a block"; inventory
first opened while empty of a Workbench → hint about crafting one; first
night approaching → hint about shelter) — each shown once ever, stored as
a flag in local settings (not per-world), fully disable-able from Settings
→ Gameplay.

## 12. Chat / command console (single-player admin console)

Even with no other players to chat with, a lightweight console (opened
via `/` or `T`, matching genre convention) is included for: quick text
commands (`/time set day`, `/tp`, `/give`, `/gamemode`, `/weather` — a
small, single-player "cheat console" rather than a multiplayer chat
system), and as the text-entry surface for Signpost editing and world/
Blueprint renaming reuses the same text-input component. Command
availability can be toggled off entirely per-world at creation (a
"Cheats Off" world behaves as a clean, no-console-commands save for
players who want that).
