// Block ids the ice castle's blueprint draws with, resolved once.
import { getBlockByKey } from "../../data/blocks";

const id = (key: string): number => getBlockByKey(key).id;

export const AIR = 0;
export const B = {
  BRICK: id("frost_brick"),
  CRACKED: id("frost_brick_cracked"),
  RIMED: id("frost_brick_rimed"),
  SNOWY: id("frost_brick_snowy"),
  POLISHED: id("frost_polished"),
  COLUMN: id("frost_column"),
  FLOOR_LIGHT: id("frost_floor_light"),
  FLOOR_DARK: id("frost_floor_dark"),
  TRIM: id("frost_trim"),
  LOOSE_BRICK: id("loose_brick"),
  ROCK: id("glacier_rock"),
  COBBLE: id("glacier_cobble"),
  SNOW_ROCK: id("snow_rock"),
  PACKED_ICE: id("packed_ice"),
  BLUE_ICE: id("blue_ice"),
  CRYSTAL: id("frost_crystal"),
  ROOF: id("frost_roof"),
  RIDGE: id("frost_roof_ridge"),
  ROOF_SNOWY: id("frost_roof_snowy"),
  WINDOW: id("frost_window"),
  WINDOW_TOP: id("frost_window_top"),
  WINDOW_DARK: id("frost_window_dark"),
  SLIT: id("frost_slit"),
  DOOR_BOTTOM: id("frost_door_bottom"),
  DOOR_TOP: id("frost_door_top"),
  TIMBER: id("frost_timber"),
  PLASTER: id("frost_plaster"),
  LANTERN: id("frost_lantern"),
  ICICLE: id("icicle"),
  SHELF: id("frost_bookshelf"),
  SHELF_LOOSE: id("frost_bookshelf_loose"),
  CARPET: id("frost_carpet"),
  SNOW: id("snow_block"),
  GRATE: id("iron_grate"),
  BRAZIER: id("frost_brazier"),
  FLAME: id("frost_flame"),
  GILDED: id("gilded_trim"),
  PLANKS: id("plank"),
  /** The 3x3 rose window's nine tiles, row-major (north row first, west to east). */
  ROSE: [0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => id(`frost_rose_${i}`)),
} as const;
