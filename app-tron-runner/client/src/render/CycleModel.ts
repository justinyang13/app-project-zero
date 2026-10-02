import * as THREE from 'three';

export class CycleModel {
  private model: THREE.Group;
  private body: THREE.Mesh;
  private wheels: THREE.Mesh[];
  private canopy: THREE.Mesh;
  private trail: THREE.Mesh;
  private trailMat: THREE.MeshBasicMaterial;
  
  constructor() {
    this.model = new THREE.Group();
    this.wheels = [];
    
    // Create cycle body (stretched capsule)
    const bodyGeometry = new THREE.CapsuleGeometry(0.8, 2.0, 4, 8);
    const bodyMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x111111,
      metalness: 0.9,
      roughness: 0.25
    });
    
    this.body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    this.body.rotation.x = Math.PI / 2;
    this.model.add(this.body);
    
    // Create wheels
    const wheelGeometry = new THREE.TorusGeometry(0.4, 0.15, 8, 32);
    const wheelMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x111111,
      metalness: 0.9,
      roughness: 0.25
    });
    
    // Front wheel
    const frontWheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
    frontWheel.rotation.z = Math.PI / 2;
    frontWheel.position.x = 1.2;
    this.model.add(frontWheel);
    this.wheels.push(frontWheel);
    
    // Back wheel
    const backWheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
    backWheel.rotation.z = Math.PI / 2;
    backWheel.position.x = -1.2;
    this.model.add(backWheel);
    this.wheels.push(backWheel);
    
    // Create canopy
    const canopyGeometry = new THREE.CylinderGeometry(0.8, 0.8, 0.3, 16);
    const canopyMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x111111,
      metalness: 0.9,
      roughness: 0.25
    });
    
    this.canopy = new THREE.Mesh(canopyGeometry, canopyMaterial);
    this.canopy.position.y = 1.2;
    this.model.add(this.canopy);
    
    // Create light trail (additive cyan strip)
    const trailGeometry = new THREE.PlaneGeometry(0.5, 3.0);
    const trailMaterial = new THREE.MeshBasicMaterial({ 
      color: 0x19f2ff,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending
    });
    this.trailMat = trailMaterial;
    
    this.trail = new THREE.Mesh(trailGeometry, trailMaterial);
    this.trail.position.set(0, 0, -2.0);
    this.model.add(this.trail);
  }
  
  getModel(): THREE.Group {
    return this.model;
  }
  
  update(state: any): void {
    // Update cycle animation
    
    // Simple rotation for wheels
    const time = Date.now() * 0.01;
    this.wheels.forEach(wheel => {
      wheel.rotation.y += 0.2;
    });
    
    // Tuck position when sliding or jumping
    if (state.isSliding || state.vy !== 0) {
      this.model.position.y = 0.9;
    } else {
      this.model.position.y = 1.8;
    }
    
    // Update trail effect
    if (this.trail) {
      this.trailMat.opacity = Math.sin(time * 5) * 0.3 + 0.4;
    }
    
    // Update position
    this.model.position.x = state.x;
    this.model.position.y = state.y;
    this.model.position.z = state.z;
  }
  
  reset(): void {
    this.model.position.set(0, 0, 0);
    this.model.rotation.set(0, 0, 0);
    
    // Reset wheels
    this.wheels.forEach(wheel => {
      wheel.rotation.set(0, 0, 0);
    });
  }
}