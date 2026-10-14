// Every castle in the world. Order is irrelevant — their plan boxes never overlap.
import { ICE_SITE } from "../iceCastle/iceSite";
import { DARK_SITE } from "./darkSite";
import type { CastleSite } from "./site";

export const CASTLE_SITES: readonly CastleSite[] = [DARK_SITE, ICE_SITE];
