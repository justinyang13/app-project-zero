# 16 — Controls & Accessibility

## 1. Keyboard & mouse (default bindings)

All bindings below are rebindable via Settings → Controls (see
[12 — UI/UX](12-ui-ux.md) §9); defaults chosen to match genre-standard
muscle memory where one exists.

| Action | Default key |
|---|---|
| Move forward/back/left/right | `W` `S` `A` `D` |
| Jump | `Space` |
| Sneak (hold) | `Shift` |
| Sprint (hold/toggle, per setting) | `Ctrl` |
| Break block / Attack | Left Mouse Button |
| Place block / Use / Interact | Right Mouse Button |
| Pick block (eyedropper) | Middle Mouse Button |
| Hotbar slot 1–9 | `1`–`9` |
| Cycle hotbar | Scroll Wheel |
| Open inventory | `E` |
| Drop held item | `Q` |
| Swap main/off-hand | `F` |
| Toggle fly (Creative) | Double-tap `Space` |
| Third-person camera toggle | `F5` |
| Photo Mode | `F6` |
| Open Full Map | `M` |
| Open console/command | `/` or `T` |
| Debug overlay | `F3` |
| Pause menu | `Esc` |
| Sleep (when facing a Bed) | Right Mouse Button (context) |

## 2. Touch controls (mobile/tablet)

- **Movement:** a virtual joystick, bottom-left, thumb-draggable,
  auto-anchoring to first-touch position within its zone (rather than a
  fixed-position stick) for comfort across hand sizes.
- **Camera look:** drag anywhere on the right two-thirds of the screen
  (outside the joystick zone and hotbar) rotates the camera, matching
  genre-standard mobile voxel-game convention.
- **Break/place:** a dedicated pair of on-screen buttons (bottom-right)
  rather than relying on tap-and-hold-to-break gestures layered onto
  camera drag, which tends to be error-prone; hold-to-break shows the
  same crack-stage progress as desktop.
- **Hotbar:** always-visible tappable row along the bottom, same 9 slots.
- **Inventory/menus:** tap-to-select, tap-destination-to-place model
  (rather than drag-and-drop) for all inventory/crafting screens, since
  precise drag gestures are harder on touch — see
  [12 — UI/UX](12-ui-ux.md) §4.
- **Pinch-to-zoom** on the Full Map screen; two-finger tap opens the
  pause menu as an alternate to a visible pause button (both available).
- Touch target sizes follow platform accessibility minimums (44×44pt
  equivalent) throughout.

## 3. Gamepad support

Standard gamepad mapping (Xbox-layout reference, remappable): left stick
move, right stick look, `A`/Cross jump, `RT`/`R2` break/attack, `LT`/`L2`
place/use, `B`/Circle sneak, `X`/Square sprint-hold, bumpers cycle
hotbar, `Y`/Triangle open inventory, `D-Pad` quick-select hotbar in
groups, `Start`/`Options` pause. Inventory/crafting screens use a
D-pad/stick-navigable cursor grid rather than requiring a mouse pointer.
Vibration/haptics (where supported) on taking damage, breaking a block,
and Powder Charge detonation — togglable off.

## 4. Accessibility features

- **Colorblind-friendly palette review:** the 16-color dye system (see
  [03 — Blocks & Materials](03-blocks-materials.md) §2.9) and UI status
  icons are chosen/reviewed against Deuteranopia/Protanopia/Tritanopia
  simulation, with icon shape (not color alone) distinguishing dye colors
  in the inventory tooltip and status-effect icons always paired with a
  distinct icon shape, never color-only.
- **Text scaling:** a global UI text-size multiplier (Settings →
  Accessibility), independent of render resolution.
- **Reduced motion:** disables head bob (see
  [05 — Player Mechanics](05-player-mechanics.md) §2), screen-shake
  (Powder Charge detonation, taking heavy damage), and the damage-flash
  vignette pulse (see [12](12-ui-ux.md) §3), replacing them with static
  or minimal equivalents.
- **High-contrast crosshair/UI mode:** an alternate high-contrast
  crosshair and HUD outline style for low-vision players.
- **Subtitles/captions:** all audio cues with gameplay meaning (hostile-
  creature proximity growl, thunder, Powder Charge fuse-tick, drowning
  warning) have an optional on-screen text/icon caption equivalent,
  togglable independently of general sound settings.
- **Remappable everything:** every keyboard/mouse/gamepad binding in §1
  and §3 is individually rebindable, including separating "break" and
  "attack" onto different inputs for players who find the combined
  default awkward.
- **Toggle-hold options:** Sprint, Sneak, and (where relevant) block-
  breaking can each independently be set to toggle-on-press rather than
  hold, for players with limited hold-duration dexterity.
- **Difficulty as accessibility, not just challenge:** Peaceful
  difficulty (see [07 — Survival Systems](07-survival-systems.md) §7) and
  Creative Mode (see
  [17 — Game Modes & Progression](17-game-modes-progression.md) §1) are
  explicitly positioned in-product as valid, complete ways to play, not
  "easy mode" framed as lesser — relevant to players for whom combat/
  hunger-pressure mechanics are an accessibility barrier, not just a
  difficulty preference.
- **Auto-mine-similar and other manual-dexterity-reducing QoL toggles**
  (see [05 — Player Mechanics](05-player-mechanics.md) §4) are grouped
  under Accessibility in the settings UI as well as Gameplay, so they're
  discoverable from either mental model.

## 5. Localization readiness (not full localization in MVP)

All player-facing strings (item/block names, UI labels, hint toasts) are
routed through a single string-table module from the start, even though
the MVP ships English-only — this is cheap to do up front and expensive
to retrofit, so it's specified as a baseline engineering practice here
rather than deferred; full translation work itself is out of MVP scope
(see [22 — Roadmap & Milestones](22-roadmap-milestones.md)).
