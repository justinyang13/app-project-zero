import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { SMAAPass } from 'three/examples/jsm/postprocessing/SMAAPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { NeonPostShader } from './postfx';

export type Quality = 'High' | 'Low';

export class Renderer {
  private renderer: THREE.WebGLRenderer;
  private composer: EffectComposer;
  private bloomPass: UnrealBloomPass;
  private neonPass: ShaderPass;
  private smaaPass: SMAAPass;
  private outputPass: OutputPass;
  private quality: Quality = 'High';
  private scene: THREE.Scene | null = null;
  private camera: THREE.Camera | null = null;

  constructor() {
    this.renderer = new THREE.WebGLRenderer({
      antialias: false,
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.85;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    // Accumulate stats across all composer passes (M11 fix #6).
    this.renderer.info.autoReset = false;

    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene ?? new THREE.Scene(), this.camera ?? new THREE.PerspectiveCamera()));
    this.bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      0.55, 0.5, 0.75,
    );
    this.neonPass = new ShaderPass(NeonPostShader);
    this.neonPass.uniforms.resolution.value.set(window.innerWidth, window.innerHeight);
    this.smaaPass = new SMAAPass();
    this.outputPass = new OutputPass();

    this.applyQuality('High');
  }

  /** Attach scene/camera to the render pass (call once after scene exists). */
  attach(scene: THREE.Scene, camera: THREE.Camera): void {
    this.scene = scene;
    this.camera = camera;
    const renderPass = this.composer.passes[0] as RenderPass;
    renderPass.scene = scene;
    renderPass.camera = camera;
  }

  private applyQuality(q: Quality): void {
    this.quality = q;
    if (q === 'High') {
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      this.bloomPass.enabled = true;
      this.bloomPass.strength = 0.55;
      this.smaaPass.enabled = true;
      this.composer.passes = [
        this.composer.passes[0], this.bloomPass, this.neonPass, this.smaaPass, this.outputPass,
      ];
    } else {
      this.renderer.setPixelRatio(1);
      this.bloomPass.enabled = true;
      this.bloomPass.strength = 0.45;
      this.smaaPass.enabled = false;
      this.composer.passes = [
        this.composer.passes[0], this.bloomPass, this.neonPass, this.outputPass,
      ];
    }
    this.composer.setSize(this.renderer.domElement.width, this.renderer.domElement.height);
  }

  public render(): void {
    if (!this.scene || !this.camera) return;
    this.renderer.info.reset();
    this.composer.render();
  }

  public setSize(width: number, height: number): void {
    this.renderer.setSize(width, height);
    this.composer.setSize(width, height);
    this.neonPass.uniforms.resolution.value.set(width, height);
  }

  public getRenderer(): THREE.WebGLRenderer {
    return this.renderer;
  }

  public getQuality(): Quality {
    return this.quality;
  }

  public setQuality(q: Quality): void {
    this.applyQuality(q);
  }

  public toggleQuality(): Quality {
    this.setQuality(this.quality === 'High' ? 'Low' : 'High');
    return this.quality;
  }

  /** Drive the NeonPost uniforms (speed, glitch, time). */
  public setPostFX(time: number, chromatic: number, glitch: number): void {
    this.neonPass.uniforms.time.value = time;
    this.neonPass.uniforms.chromaticAberration.value = chromatic;
    this.neonPass.uniforms.glitch.value = glitch;
  }

  public getGlitch(): number {
    return this.neonPass.uniforms.glitch.value as number;
  }

  public dispose(): void {
    this.renderer.dispose();
  }
}
