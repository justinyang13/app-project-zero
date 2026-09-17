import { TouchJoystick } from "./TouchJoystick";
import { TouchLookArea } from "./TouchLookArea";
import { TouchActionButtons } from "./TouchActionButtons";

/**
 * Composes every touch-only control into one mount point for App.tsx.
 * Each child component independently gates on useIsTouchDevice() and
 * returns null when it's false, so this renders nothing at all on
 * desktop — no conditional needed here beyond that.
 */
export function TouchControls() {
  return (
    <>
      <TouchLookArea />
      <TouchJoystick />
      <TouchActionButtons />
    </>
  );
}
