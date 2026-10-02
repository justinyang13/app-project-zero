import * as THREE from 'three';

// Section color palettes from SPEC §8.2 (exported so Track can tint walls)
export const SECTION_PALETTES = [
  { floor: 0xff7a18, wall: 0x19f2ff, sky: 0x05071a }, // 0 orange/cyan/blue
  { floor: 0xff7a18, wall: 0x19f2ff, sky: 0x05071a }, // 1 orange/teal/blue  
  { floor: 0xff7a18, wall: 0xff2bd6, sky: 0x05071a }, // 2 magenta-led (walls magenta) with orange floor
  { floor: 0xff7a18, wall: 0xff1744, sky: 0x3d0000 }, // 3 red-orange/violet (hot)
  { floor: 0x19f2ff, wall: 0x19f2ff, sky: 0x000033 }, // 4 cyan/cyan (cold, blue-white)
  { floor: 0xff7a18, wall: 0xff2bd6, sky: 0x000000 }, // 5 orange+magenta+cyan mix, high contrast
  { floor: 0xff7a18, wall: 0xff7a18, sky: 0x3d0000 }  // 6 deep red/orange with a bright green portal beam far ahead
];

export class Environment {
  private skySphere: THREE.Mesh;
  private fog: THREE.Fog;
  private hemisphereLight: THREE.HemisphereLight;
  private rimLight: THREE.DirectionalLight;
  private playerLight: THREE.PointLight;
  private currentPaletteIndex = 0;
  private targetPaletteIndex = 0;
  private paletteLerp = 1.0;
  private beatPulse = 1.0;
  private tmpColorA = new THREE.Color();
  private tmpColorB = new THREE.Color();
  private baseHemiIntensity = 0.3;
  private baseRimIntensity = 0.8;
  private basePlayerIntensity = 1.0;

  constructor(scene: THREE.Scene) {
    // Sky: load the real sky.jpg (SPEC §8.2) onto a large inverted sphere
    // that follows the camera (a flat image is not equirectangular, so
    // scene.background would not show the city band correctly).
    const skyTex = new THREE.TextureLoader().load(
      `${import.meta.env.BASE_URL}assets/img/sky.jpg`,
    );
    skyTex.colorSpace = THREE.SRGBColorSpace;
    skyTex.wrapS = THREE.RepeatWrapping;
    skyTex.wrapT = THREE.ClampToEdgeWrapping;
    skyTex.repeat.set(1, 1);
    skyTex.offset.set(0, 0.0);

    const skyGeometry = new THREE.SphereGeometry(500, 32, 32);
    const skyMaterial = new THREE.MeshBasicMaterial({
      map: skyTex,
      side: THREE.BackSide,
      fog: false,
      depthWrite: false,
      toneMapped: false,
    });

    this.skySphere = new THREE.Mesh(skyGeometry, skyMaterial);
    this.skySphere.renderOrder = -1;
    this.skySphere.frustumCulled = false;
    // M13 #3: rotate so the green light beam (image centre, u = 0.5 → +x)
    // faces ahead of the player (-z), and tilt so the neon city / grid
    // horizon band (lower-middle of the image) sits just above the
    // horizontal view line, not at the top of the screen.
    this.skySphere.rotation.set(-0.15, Math.PI / 2, 0);
    scene.add(this.skySphere);

    // Create fog (linear so towers at 60–200 m stay visible, M12 fix #2;
    // M13 #3: slightly lighter colour)
    this.fog = new THREE.Fog(0x0a1030, 80, 420);
    scene.fog = this.fog;
    
    // Create lighting
    this.hemisphereLight = new THREE.HemisphereLight(0xff7a18, 0x19f2ff, 0.3);
    scene.add(this.hemisphereLight);
    
    this.rimLight = new THREE.DirectionalLight(0x19f2ff, 0.8);
    this.rimLight.position.set(0, 10, -10);
    scene.add(this.rimLight);
    
    // Create player light (follows the player)
    this.playerLight = new THREE.PointLight(0x19f2ff, 1.0, 20);
    scene.add(this.playerLight);
  }

  public setSection(section: number) {
    this.targetPaletteIndex = Math.min(Math.max(section, 0), SECTION_PALETTES.length - 1);
    this.paletteLerp = 0;
  }

  /**
   * Beat pulse (SPEC §8.2): `pulse` is a value in [0.8, 1] from
   * `beatPulse(phase)` — light intensities scale by it, giving a ~20%
   * pulse on every beat of the current track.
   */
  public setBeat(pulse: number) {
    this.beatPulse = Math.max(0.5, Math.min(1.2, pulse));
    this.hemisphereLight.intensity = this.baseHemiIntensity * this.beatPulse;
    this.rimLight.intensity = this.baseRimIntensity * this.beatPulse;
    this.playerLight.intensity = this.basePlayerIntensity * this.beatPulse;
  }

  public update(_playerDist: number, camera?: THREE.Camera) {
    // Sky sphere follows the camera so the city band stays at the horizon.
    if (camera) this.skySphere.position.copy(camera.position);

    // Interpolate palette colors
    if (this.currentPaletteIndex !== this.targetPaletteIndex) {
      this.paletteLerp += 0.02;
      if (this.paletteLerp >= 1) {
        this.paletteLerp = 1;
        this.currentPaletteIndex = this.targetPaletteIndex;
      }
      
      const fromPalette = SECTION_PALETTES[this.currentPaletteIndex];
      const toPalette = SECTION_PALETTES[this.targetPaletteIndex];
      
      // Interpolate fog color (reused temporaries, no per-frame allocation)
      this.tmpColorA.setHex(fromPalette.sky);
      this.tmpColorB.setHex(toPalette.sky);
      this.fog.color.lerpColors(this.tmpColorA, this.tmpColorB, this.paletteLerp);
      
      // Update lighting colors (reused temporaries)
      this.tmpColorA.setHex(fromPalette.sky);
      this.tmpColorB.setHex(toPalette.sky);
      this.hemisphereLight.color.lerpColors(this.tmpColorA, this.tmpColorB, this.paletteLerp);

      this.tmpColorA.setHex(fromPalette.wall);
      this.tmpColorB.setHex(toPalette.wall);
      this.rimLight.color.lerpColors(this.tmpColorA, this.tmpColorB, this.paletteLerp);
    }
    
    // Update player light position to follow the player
    this.playerLight.position.set(0, 1.5, 0);
  }
}