import * as THREE from 'three';

export const NeonPostShader = {
  uniforms: {
    tDiffuse: { value: null },
    resolution: { value: new THREE.Vector2() },
    time: { value: 0 },
    chromaticAberration: { value: 0.001 },
    glitch: { value: 0.0 },
    vignette: { value: 0.5 }
  },

  vertexShader: `
    varying vec2 vUv;
    
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,

  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform vec2 resolution;
    uniform float time;
    uniform float chromaticAberration;
    uniform float glitch;
    uniform float vignette;
    
    varying vec2 vUv;
    
    void main() {
      vec2 uv = vUv;
      
      // Chromatic aberration effect
      if (chromaticAberration > 0.0) {
        vec2 offset = vec2(chromaticAberration * sin(time * 2.0), chromaticAberration * cos(time * 3.0));
        vec4 r = texture2D(tDiffuse, uv + offset);
        vec4 g = texture2D(tDiffuse, uv);
        vec4 b = texture2D(tDiffuse, uv - offset);
        gl_FragColor = vec4(r.r, g.g, b.b, 1.0);
      } else {
        gl_FragColor = texture2D(tDiffuse, uv);
      }
      
      // Subtle multiplicative scanlines (kept <= 0.02 to avoid banding)
      float scanline = 1.0 - 0.02 * (0.5 + 0.5 * sin(uv.y * resolution.y * 0.5));
      gl_FragColor.rgb *= scanline;

      // Very subtle film grain
      float grain = fract(sin(dot(uv * resolution, vec2(12.9898, 78.233))) * 43758.5453);
      gl_FragColor.rgb += (grain - 0.5) * 0.01;
      
      // Add glitch effect
      if (glitch > 0.0) {
        float glitchEffect = sin(time * 10.0) * glitch * 0.1;
        vec2 glitchOffset = vec2(glitchEffect, 0.0);
        vec4 glitchColor = texture2D(tDiffuse, uv + glitchOffset);
        gl_FragColor = mix(gl_FragColor, glitchColor, glitch);
      }
      
      // Add vignette
      if (vignette > 0.0) {
        vec2 center = vec2(0.5, 0.5);
        float dist = distance(uv, center);
        float vignetteFactor = 1.0 - smoothstep(0.0, 1.0, dist);
        gl_FragColor.rgb *= (1.0 - vignette * vignetteFactor * 0.5);
      }
    }
  `
};