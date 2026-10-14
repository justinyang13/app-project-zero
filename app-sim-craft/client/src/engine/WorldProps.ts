// The fixed, seed-anchored scenery that isn't voxels: campfire flames, street
// lamp bulbs and the castles' banners. They're placed on the heights world
// generation reports (so they don't wait on chunk load) and animate — or, for
// the lamps, switch on at night — every frame.
import type * as THREE from "three";
import { CAMPFIRE_SITES, LAMP_POST_HEIGHT, LAMP_SITES, type getStructureAnchors } from "../worldgen/structures";
import { CampfireVisual } from "./CampfireVisual";
import { DARK_SITE } from "../worldgen/castle/darkSite";
import { ICE_SITE } from "../worldgen/iceCastle/iceSite";
import { CastleBanners } from "./CastleBanners";
import { StreetLamp } from "./StreetLamp";

export class WorldProps {
  private readonly scene: THREE.Scene;
  private readonly campfires: CampfireVisual[];
  private readonly streetLamps: StreetLamp[];
  private readonly castleBanners: CastleBanners[];

  constructor(scene: THREE.Scene, anchors: ReturnType<typeof getStructureAnchors>) {
    this.scene = scene;
    this.campfires = CAMPFIRE_SITES.map((site, i) => new CampfireVisual(site.x, anchors.campfireYs[i], site.z));
    this.streetLamps = LAMP_SITES.map((site, i) => new StreetLamp(site.x, anchors.lampYs[i], site.z, LAMP_POST_HEIGHT));
    this.castleBanners = [new CastleBanners(DARK_SITE, "dark"), new CastleBanners(ICE_SITE, "ice")];
    for (const campfire of this.campfires) scene.add(campfire.group);
    for (const lamp of this.streetLamps) scene.add(lamp.group);
    for (const banners of this.castleBanners) scene.add(banners.group);
  }

  update(dt: number, nowSeconds: number, night: boolean): void {
    for (const banners of this.castleBanners) banners.update(nowSeconds);
    for (const campfire of this.campfires) campfire.update(dt);
    for (const lamp of this.streetLamps) lamp.setOn(night);
  }

  dispose(): void {
    for (const campfire of this.campfires) {
      this.scene.remove(campfire.group);
      campfire.dispose();
    }
    for (const lamp of this.streetLamps) {
      this.scene.remove(lamp.group);
      lamp.dispose();
    }
    for (const banners of this.castleBanners) {
      this.scene.remove(banners.group);
      banners.dispose();
    }
  }
}
