// The marker set both maps draw: the fixed landmarks plus everything live in
// the world. Cheap to rebuild every frame — a handful of fixed points and one
// per creature/fish.
import type { Entity } from "../entities/Entity";
import type { MapMarker, PlacedTorch } from "../core/playerState";
import { CAMPFIRE_SITES, CASTLE_CENTER } from "../worldgen/structures";
import type { MiniMapMarker, MiniMapMarkerKind } from "./MiniMap";

export interface MarkerSources {
  dragons: Iterable<Entity>;
  creatures: Iterable<Entity>;
  fish: Iterable<Entity>;
  customMarkers: readonly MapMarker[];
  torches: readonly PlacedTorch[];
}

export function collectMapMarkers(sources: MarkerSources): MiniMapMarker[] {
  const markers: MiniMapMarker[] = [{ x: CASTLE_CENTER.x, z: CASTLE_CENTER.z, kind: "castle" }];
  const addEntities = (entities: Iterable<Entity>, kind: MiniMapMarkerKind): void => {
    for (const entity of entities) markers.push({ x: entity.position.x, z: entity.position.z, kind });
  };
  addEntities(sources.dragons, "dragon");
  for (const site of CAMPFIRE_SITES) markers.push({ x: site.x, z: site.z, kind: "campfire" });
  addEntities(sources.creatures, "creature");
  addEntities(sources.fish, "fish");
  for (const marker of sources.customMarkers) markers.push({ x: marker.x, z: marker.z, kind: "custom" });
  for (const torch of sources.torches) markers.push({ x: torch.x, z: torch.z, kind: "torch" });
  return markers;
}

/** The full-screen map shows landmarks, not the swarm of creatures, fish and torches. */
export function landmarkMarkers(markers: MiniMapMarker[]): MiniMapMarker[] {
  return markers.filter((m) => m.kind !== "creature" && m.kind !== "fish" && m.kind !== "torch");
}
