import { LOBIA_WEATHERS } from "../data/weather-data.mjs";

// Foundry ambience supplies the mist and leaf base; custom shaders and
// particles depict the other weathers. Rules remain in the Météo journal.
const PRESETS = {
  "champ-magnetique": ["fog", {}],
  "pluie-de-meteores": ["snow", {}],
  pluie: ["rain", {}],
  orage: ["rain", {}],
  brume: ["fog", { intensity: 0.95, slope: 0.42, speed: 0.25, tint: [0.82, 0.9, 1] }],
  zenith: ["fog", { intensity: 0.16, speed: 0.12, tint: [1, 0.85, 0.55] }],
  grele: ["snow", {}],
  neige: ["snow", {}],
  "champ-de-purete": ["fog", { intensity: 0.25, speed: 0.3, tint: [0.94, 0.82, 1] }],
  "champ-herbu": ["leaves", {}],
  "champ-pollue": ["fog", { intensity: 0.25, speed: 0.3, tint: [0.7, 0.85, 0.55] }],
  "champ-psychique": ["fog", { intensity: 0.2, speed: 0.2, tint: [0.85, 0.65, 1] }],
  "tempete-de-sable": ["fog", { intensity: 0.3, speed: 0.8, tint: [1, 0.8, 0.5] }],
  secheresse: ["fog", { intensity: 0.16, speed: 0.3, tint: [1, 0.75, 0.5] }],
  "porte-des-morts": ["fog", { intensity: 0.28, speed: 0.2, tint: [0.65, 0.75, 0.85] }],
  nuit: ["fog", { intensity: 0.22, speed: 0.15, tint: [0.45, 0.55, 0.85] }],
  mistral: ["leaves", {}]
};

// Soft, sparse motes add motion to the remaining abstract weathers. Mist,
// snow, hail, magnetic waves and meteors have their own dedicated effects.
const MOTES = {
  zenith: "ffdb82",
  "champ-psychique": "d4a0ff",
  "tempete-de-sable": "efc78a",
  secheresse: "ffb472",
  "porte-des-morts": "a8d5d3",
  nuit: "9ba9e9"
};

const weatherId = key => `lobia-${key}`;

/** Register scene weather types before the Scene Config and canvas use them. */
export function registerLobiaWeather() {
  const shaders = foundry.canvas.rendering.shaders;
  // Cyan rings expand from a focal point, fading as they cross the scene.
  class LobiaMagneticShader extends shaders.AbstractWeatherShader {
    static defaultUniforms = {};
    static fragmentShader = `
      ${this.FRAGMENT_HEADER}
      void main() {
        ${this.COMPUTE_MASK}
        vec2 offset = (vStaticUvs - vec2(0.46, 0.52)) * vec2(1.4, 1.0);
        float radius = length(offset);
        float ring = pow(max(0.0, cos(radius * 74.0 - time * 2.3)), 16.0);
        float fade = 1.0 - smoothstep(0.1, 0.85, radius);
        float centerGlow = (1.0 - smoothstep(0.0, 0.18, radius)) * 0.12;
        gl_FragColor = vec4(vec3(0.35, 0.78, 1.0) * (ring * 0.48 * fade + centerGlow)
          * mask * alpha, 1.0);
      }
    `;
  }

  // A brief double flash and a jagged bolt every several seconds. Kept soft
  // enough to leave the map and tokens readable during a storm.
  class LobiaLightningShader extends shaders.AbstractWeatherShader {
    static defaultUniforms = {};
    static fragmentShader = `
      ${this.FRAGMENT_HEADER}
      void main() {
        ${this.COMPUTE_MASK}
        float cycle = floor(time / 8.0);
        float phase = fract(time / 8.0);
        float flash = (1.0 - smoothstep(0.0, 0.018, phase))
                    + 0.65 * (smoothstep(0.027, 0.032, phase) - smoothstep(0.032, 0.05, phase));
        float x = 0.2 + 0.6 * fract(sin(cycle * 73.17 + 19.1) * 43758.5453);
        float jag = (fract(sin(floor(vStaticUvs.y * 18.0) * 19.17 + cycle * 7.0) * 821.21) - 0.5) * 0.09;
        float distanceToBolt = abs(vStaticUvs.x - x - jag - vStaticUvs.y * 0.08);
        float bolt = (1.0 - smoothstep(0.003, 0.009, distanceToBolt)) * (1.0 - smoothstep(0.75, 0.95, vStaticUvs.y));
        float glow = (1.0 - smoothstep(0.0, 0.11, distanceToBolt)) * 0.3;
        gl_FragColor = vec4(vec3(0.75, 0.85, 1.0) * (0.12 + bolt * 0.55 + glow)
          * flash * mask * alpha, 1.0);
      }
    `;
  }

  // Slow, broad golden shafts that brighten the upper part of the scene.
  class LobiaSunlightShader extends shaders.AbstractWeatherShader {
    static defaultUniforms = {};
    static fragmentShader = `
      ${this.FRAGMENT_HEADER}
      void main() {
        ${this.COMPUTE_MASK}
        vec2 uv = vStaticUvs;
        float bands = pow(max(0.0, sin((uv.x + uv.y * 0.65) * 35.0
          + sin(time * 0.12) * 0.5)), 5.0);
        float height = 1.0 - smoothstep(0.05, 1.0, uv.y);
        float strength = (0.12 + 0.55 * bands) * (0.3 + 0.7 * height);
        gl_FragColor = vec4(vec3(1.0, 0.77, 0.38) * strength * mask * alpha, 1.0);
      }
    `;
  }

  // These overlays complement the stock fog/leaves and sparse motes. They use
  // scene UVs so their shapes stay anchored as the camera pans and zooms.
  const atmosphereShader = fragment => class extends shaders.AbstractWeatherShader {
    static defaultUniforms = {};
    static fragmentShader = `
      ${this.FRAGMENT_HEADER}
      void main() {
        ${this.COMPUTE_MASK}
        ${fragment}
      }
    `;
  };

  const ATMOSPHERES = {
    // Pink-violet pools echo the polluted field; fairy sprites drift above them.
    "champ-de-purete": atmosphereShader(`
      vec2 uv = vStaticUvs * vec2(8.0, 6.0);
      float flow = sin(uv.x + sin(uv.y * 1.8 + time * 0.35))
        * sin(uv.y * 1.4 - time * 0.28 + sin(uv.x));
      float glades = smoothstep(0.05, 0.8, flow) * 0.24;
      float hue = 0.5 + 0.5 * sin(uv.x * 0.7 + uv.y * 1.3 + time * 0.22);
      vec3 fairy = mix(vec3(0.94, 0.48, 0.88), vec3(0.65, 0.42, 1.0),
        smoothstep(0.25, 0.75, hue));
      gl_FragColor = vec4(fairy * glades * mask * alpha, 1.0);
    `),
    // Irregular green and violet toxic pools through the sickly fog.
    "champ-pollue": atmosphereShader(`
      vec2 uv = vStaticUvs * vec2(8.0, 6.0);
      float sludge = sin(uv.x + sin(uv.y * 1.8 + time * 0.35))
        * sin(uv.y * 1.4 - time * 0.28 + sin(uv.x));
      float pools = smoothstep(0.15, 0.75, sludge) * 0.24;
      float venom = 0.5 + 0.5 * sin(uv.x * 0.7 + uv.y * 1.3 + time * 0.22);
      vec3 poison = mix(vec3(0.56, 0.12, 0.73), vec3(0.53, 0.9, 0.18),
        smoothstep(0.35, 0.65, venom));
      gl_FragColor = vec4(poison * pools
        * mask * alpha, 1.0);
    `),
    // A violet mind's-eye sends out shifting, concentric thought waves.
    "champ-psychique": atmosphereShader(`
      vec2 uv = (vStaticUvs - vec2(0.5)) * vec2(1.5, 1.0);
      float angle = atan(uv.y, uv.x);
      float radius = length(uv);
      float wave = pow(max(0.0, cos(radius * 50.0 - time * 1.5
        + sin(angle * 5.0 + time * 0.4) * 1.2)), 10.0);
      float iris = 1.0 - smoothstep(0.05, 0.75, radius);
      gl_FragColor = vec4(vec3(0.65, 0.35, 1.0) * (wave * 0.27 + iris * 0.05)
        * mask * alpha, 1.0);
    `),
    // Fast diagonal ribbons of grit move across the ochre fog.
    "tempete-de-sable": atmosphereShader(`
      vec2 uv = vStaticUvs;
      float gust = sin(uv.y * 85.0 + uv.x * 33.0 - time * 5.0
        + sin(uv.y * 19.0 - time * 1.2) * 2.0);
      float streaks = pow(max(0.0, gust), 8.0);
      float clouds = 0.5 + 0.5 * sin(uv.y * 12.0 + uv.x * 7.0 - time * 0.8);
      gl_FragColor = vec4(vec3(0.85, 0.56, 0.24) * (streaks * 0.25 + clouds * 0.08)
        * mask * alpha, 1.0);
    `),
    // Rising, wavering amber heat bands over parched ground.
    secheresse: atmosphereShader(`
      vec2 uv = vStaticUvs;
      float shimmer = sin(uv.y * 90.0 - time * 2.0
        + sin(uv.x * 23.0 + time * 0.8) * 2.5);
      float haze = pow(max(0.0, shimmer), 12.0);
      float horizon = smoothstep(0.15, 0.95, uv.y);
      gl_FragColor = vec4(vec3(1.0, 0.43, 0.13) * (0.035 + haze * 0.18)
        * horizon * mask * alpha, 1.0);
    `),
    // A rectangular door: glowing jambs, lintel, threshold, panels and knob.
    "porte-des-morts": atmosphereShader(`
      vec2 uv = vStaticUvs;
      float inside = (1.0 - smoothstep(0.15, 0.18, abs(uv.x - 0.5)))
        * smoothstep(0.18, 0.21, uv.y) * (1.0 - smoothstep(0.82, 0.85, uv.y));
      float jambs = (1.0 - smoothstep(0.008, 0.025, abs(abs(uv.x - 0.5) - 0.17)))
        * smoothstep(0.18, 0.21, uv.y) * (1.0 - smoothstep(0.84, 0.87, uv.y));
      float lintel = (1.0 - smoothstep(0.008, 0.025, abs(uv.y - 0.2)))
        * (1.0 - smoothstep(0.17, 0.2, abs(uv.x - 0.5)));
      float threshold = (1.0 - smoothstep(0.008, 0.025, abs(uv.y - 0.85)))
        * (1.0 - smoothstep(0.17, 0.2, abs(uv.x - 0.5)));
      float panel = (1.0 - smoothstep(0.006, 0.018, abs(uv.x - 0.5))) * inside;
      float knob = (1.0 - smoothstep(0.008, 0.025,
        length((uv - vec2(0.53, 0.56)) * vec2(1.0, 0.8)))) * inside;
      float veil = inside * (0.5 + 0.5 * sin(uv.y * 28.0 + time * 1.1
        + sin(uv.x * 20.0)));
      gl_FragColor = vec4(vec3(0.25, 0.85, 0.75)
        * ((jambs + lintel + threshold) * 0.6 + panel * 0.2 + knob * 0.7 + veil * 0.16)
        * mask * alpha, 1.0);
    `),
    // A dark blue veil, scattered stars and a deeper edge vignette.
    nuit: atmosphereShader(`
      vec2 uv = vStaticUvs;
      vec2 cell = floor(uv * vec2(48.0, 32.0));
      float seed = fract(sin(dot(cell, vec2(127.1, 311.7))) * 43758.5453);
      float star = (1.0 - smoothstep(0.02, 0.13,
        length(fract(uv * vec2(48.0, 32.0)) - 0.5)))
        * step(0.93, seed) * (0.5 + 0.5 * sin(time * 1.4 + seed * 20.0));
      float edge = smoothstep(0.15, 0.72, length((uv - 0.5) * vec2(1.3, 1.0)));
      gl_FragColor = vec4(vec3(0.025, 0.04, 0.11) + vec3(0.55, 0.65, 0.95) * star,
        (0.18 + 0.24 * edge + star * 0.35) * mask * alpha);
    `),
    // Pale horizontal air currents reinforce the fast sideways leaves.
    mistral: atmosphereShader(`
      vec2 uv = vStaticUvs;
      float stream = sin(uv.y * 73.0 + sin(uv.x * 11.0 - time * 1.4) * 1.5);
      float rush = pow(max(0.0, stream), 14.0);
      float breakUp = 0.45 + 0.55 * sin(uv.x * 35.0 - time * 5.0);
      gl_FragColor = vec4(vec3(0.65, 0.85, 0.95) * rush * breakUp * 0.23
        * mask * alpha, 1.0);
    `)
  };

  // Created during init: Foundry's canvas classes are available by then.
  class LobiaWeatherMotes extends foundry.canvas.containers.ParticleEffect {
    getParticleEmitters({ color, wind = false }) {
      const d = canvas.dimensions;
      const maxParticles = Math.max(24, Math.min(350, Math.round(
        (d.sceneRect.width / d.size) * (d.sceneRect.height / d.size) * 0.3
      )));
      return [this.createEmitter({
        lifetime: wind ? { min: 2, max: 3 } : { min: 7, max: 10 },
        maxParticles,
        frequency: (wind ? 2.5 : 8) / maxParticles,
        behaviors: [
          { type: "alpha", config: { alpha: { list: [
            { time: 0, value: 0 }, { time: 0.25, value: wind ? 0.55 : 0.7 },
            { time: 0.75, value: wind ? 0.55 : 0.7 }, { time: 1, value: 0 }
          ] } } },
          { type: "moveSpeed", config: { speed: { list: [
            { time: 0, value: wind ? 260 : 14 }, { time: 1, value: wind ? 430 : 35 }
          ] }, minMult: wind ? 0.8 : 0.5 } },
          { type: "scale", config: { scale: { list: [
            { time: 0, value: wind ? 0.16 : 0.25 }, { time: 1, value: wind ? 0.28 : 0.45 }
          ] }, minMult: 0.5 } },
          { type: "rotation", config: { accel: 0, minSpeed: 0, maxSpeed: 0,
            minStart: wind ? 185 : 195, maxStart: wind ? 205 : 345 } },
          { type: "colorStatic", config: { color: `#${color}` } },
          { type: "textureRandom", config: { textures: ["ui/particles/snow.png"] } },
          { type: "spawnShape", config: { type: "rect", data: {
            x: d.sceneRect.x, y: d.sceneRect.y,
            w: d.sceneRect.width, h: d.sceneRect.height
          } } }
        ]
      })];
    }
  }

  // Fixed-size fairy silhouettes spawn throughout the scene and wander in
  // independent directions, rather than repeating a pattern in scene UVs.
  class LobiaFairies extends foundry.canvas.containers.ParticleEffect {
    getParticleEmitters() {
      const d = canvas.dimensions;
      const maxParticles = Math.max(5, Math.min(22, Math.round(
        (d.sceneRect.width / d.size) * (d.sceneRect.height / d.size) * 0.045
      )));
      return [this.createEmitter({
        lifetime: { min: 6, max: 10 },
        maxParticles,
        frequency: 5 / maxParticles,
        behaviors: [
          { type: "alpha", config: { alpha: { list: [
            { time: 0, value: 0 }, { time: 0.15, value: 1 },
            { time: 0.8, value: 1 }, { time: 1, value: 0 }
          ] } } },
          { type: "moveSpeedStatic", config: { min: 20, max: 55 } },
          { type: "scaleStatic", config: { min: 0.3, max: 0.45 } },
          { type: "rotation", config: { accel: 0, minSpeed: -12, maxSpeed: 12,
            minStart: 0, maxStart: 360 } },
          { type: "textureRandom", config: { textures: ["systems/lobia/assets/weather/fairy.svg"] } },
          { type: "spawnShape", config: { type: "rect", data: {
            x: d.sceneRect.x, y: d.sceneRect.y,
            w: d.sceneRect.width, h: d.sceneRect.height
          } } }
        ]
      })];
    }
  }

  // Static grass sprites line the scene's lower edge in world coordinates.
  class LobiaGrass extends foundry.canvas.containers.ParticleEffect {
    getParticleEmitters() { return []; }

    play() {
      super.play();
      if (!this.children.length) {
        const rect = canvas.dimensions.sceneRect;
        const count = Math.max(12, Math.min(150, Math.round(rect.width / 48)));
        for (let i = 0; i < count; i++) {
          const sprite = PIXI.Sprite.from("systems/lobia/assets/weather/grass.svg");
          sprite.anchor.set(0.5, 1);
          sprite.position.set(rect.x + (i + 0.5) * rect.width / count, rect.y + rect.height);
          sprite.scale.set(0.55 + (i % 3) * 0.08);
          this.addChild(sprite);
        }
      }
    }
  }

  // An emitter like Foundry's leaves, with hundreds of small falling drops.
  // Particle scale is independent of map size, unlike the stock rain shader.
  class LobiaRainDrops extends foundry.canvas.containers.ParticleEffect {
    getParticleEmitters({ storm }) {
      const d = canvas.dimensions;
      const maxParticles = Math.max(160, Math.min(1000, Math.round(
        (d.sceneRect.width / d.size) * (d.sceneRect.height / d.size) * (storm ? 2.8 : 2)
      )));
      return [this.createEmitter({
        lifetime: { min: 0.8, max: 1.1 },
        maxParticles,
        frequency: 0.9 / maxParticles,
        behaviors: [
          { type: "alpha", config: { alpha: { list: [
            { time: 0, value: storm ? 0.8 : 0.65 }, { time: 1, value: 0.4 }
          ] } } },
          { type: "moveSpeed", config: { speed: { list: [
            { time: 0, value: storm ? 950 : 700 }, { time: 1, value: storm ? 1200 : 850 }
          ] }, minMult: 0.8 } },
          { type: "scale", config: { scale: { list: [
            { time: 0, value: 0.5 }, { time: 1, value: 0.65 }
          ] }, minMult: 0.6 } },
          { type: "rotation", config: { accel: 0, minSpeed: 0, maxSpeed: 0,
            minStart: storm ? 98 : 86, maxStart: storm ? 110 : 94 } },
          { type: "colorStatic", config: { color: "#c5dcff" } },
          { type: "textureRandom", config: { textures: ["ui/particles/rain.png"] } },
          { type: "spawnShape", config: { type: "rect", data: {
            x: d.sceneRect.x, y: d.sceneRect.y,
            w: d.sceneRect.width, h: d.sceneRect.height
          } } }
        ]
      })];
    }
  }

  // Kenney's textured transparent smoke, kept sparse and translucent over fog.
  class LobiaMistClouds extends foundry.canvas.containers.ParticleEffect {
    getParticleEmitters() {
      const d = canvas.dimensions;
      const maxParticles = Math.max(25, Math.min(100, Math.round(
        (d.sceneRect.width / d.size) * (d.sceneRect.height / d.size) * 0.17
      )));
      return [this.createEmitter({
        lifetime: { min: 9, max: 12 },
        maxParticles,
        frequency: 10 / maxParticles,
        behaviors: [
          { type: "alpha", config: { alpha: { list: [
            { time: 0, value: 0 }, { time: 0.18, value: 0.5 },
            { time: 0.72, value: 0.5 }, { time: 1, value: 0 }
          ] } } },
          { type: "moveSpeed", config: { speed: { list: [
            { time: 0, value: 12 }, { time: 1, value: 20 }
          ] }, minMult: 0.5 } },
          { type: "scale", config: { scale: { list: [
            { time: 0, value: 0.4 }, { time: 1, value: 0.55 }
          ] }, minMult: 0.7 } },
          { type: "rotation", config: { accel: 0, minSpeed: 0, maxSpeed: 0, minStart: 165, maxStart: 200 } },
          { type: "textureRandom", config: { textures: ["systems/lobia/assets/weather/mist.png"] } },
          { type: "spawnShape", config: { type: "rect", data: {
            x: d.sceneRect.x, y: d.sceneRect.y,
            w: d.sceneRect.width, h: d.sceneRect.height
          } } }
        ]
      })];
    }
  }

  // A few larger, real asteroid sprites replace the dense, tiny glows.
  class LobiaMeteorFall extends foundry.canvas.containers.ParticleEffect {
    getParticleEmitters() {
      const d = canvas.dimensions;
      const [screenWidth, screenHeight] = canvas.screenDimensions;
      const top = canvas.canvasCoordinatesFromClient({ x: 0, y: 0 });
      const bottom = canvas.canvasCoordinatesFromClient({ x: screenWidth, y: screenHeight });
      const width = bottom.x - top.x;
      const height = bottom.y - top.y;
      const maxParticles = Math.max(2, Math.min(5, Math.round(
        (width / d.size) * (height / d.size) * 0.03
      )));
      return [this.createEmitter({
        lifetime: { min: height / 290, max: height / 290 },
        maxParticles,
        frequency: (height / 290) / maxParticles,
        behaviors: [
          { type: "alphaStatic", config: { alpha: 0.95 } },
          { type: "moveSpeedStatic", config: { min: 290, max: 290 } },
          { type: "scaleStatic", config: { min: 0.48, max: 0.62 } },
          { type: "rotation", config: { accel: 0, minSpeed: -25, maxSpeed: 25, minStart: 102, maxStart: 112 } },
          { type: "textureRandom", config: { textures: [
            "systems/lobia/assets/weather/meteor-1.png", "systems/lobia/assets/weather/meteor-2.png"
          ] } },
          { type: "spawnShape", config: { type: "rect", data: {
            x: top.x, y: top.y - 60, w: width, h: 0
          } } }
        ]
      })];
    }
  }

  // Snow and hail use the core flake texture, spawning at the visible top edge.
  // Their fixed downward speed and lifetime remove each flake at the bottom.
  class LobiaSnowflakes extends foundry.canvas.containers.ParticleEffect {
    viewport() {
      const [width, height] = canvas.screenDimensions;
      const top = canvas.canvasCoordinatesFromClient({ x: 0, y: 0 });
      const bottom = canvas.canvasCoordinatesFromClient({ x: width, y: height });
      return { x: top.x, y: top.y, width: bottom.x - top.x, height: bottom.y - top.y };
    }

    getParticleEmitters({ hail = false, large = false }) {
      const d = canvas.dimensions;
      const viewport = this.viewport();
      this._viewport = viewport;
      const density = large ? 0.16 : (hail ? 0.75 : 0.5);
      const maxParticles = Math.max(large ? 12 : 40, Math.min(large ? 100 : 400, Math.round(
        (viewport.width / d.size) * (viewport.height / d.size) * density
      )));
      const speed = large ? 180 : (hail ? 160 : 60);
      this._fallSpeed = speed;
      const lifetime = viewport.height / speed;
      const emitter = this.createEmitter({
        lifetime: { min: lifetime, max: lifetime },
        maxParticles,
        frequency: lifetime / maxParticles,
        behaviors: [
          { type: "alphaStatic", config: { alpha: 0.8 } },
          { type: "moveSpeedStatic", config: { min: speed, max: speed } },
          { type: "scaleStatic", config: {
            min: large ? 0.85 : (hail ? 0.45 : 0.32),
            max: large ? 1.4 : (hail ? 0.85 : 0.6)
          } },
          { type: "rotation", config: { accel: 0, minSpeed: 0, maxSpeed: 0,
            minStart: 90, maxStart: 90 } },
          { type: "colorStatic", config: { color: hail ? "#e2efff" : "#ffffff" } },
          { type: "textureRandom", config: { textures: ["ui/particles/snow.png"] } },
          { type: "spawnShape", config: { type: "rect", data: {
            x: 0, y: 0, w: viewport.width, h: 0
          } } }
        ]
      });
      emitter.updateOwnerPos(viewport.x, viewport.y);
      return [emitter];
    }

    // Keep the emission line at the screen's top when the GM pans or zooms.
    updateViewport() {
      const viewport = this.viewport();
      if (this._viewport?.x === viewport.x && this._viewport?.y === viewport.y
        && this._viewport?.width === viewport.width && this._viewport?.height === viewport.height) return;
      this._viewport = viewport;
      const emitter = this.emitters[0];
      emitter.getBehavior("spawnShape").shape.w = viewport.width;
      emitter.updateOwnerPos(viewport.x, viewport.y);
      emitter.resetPositionTracking();
      const lifetime = viewport.height / this._fallSpeed;
      emitter.minLifetime = emitter.maxLifetime = lifetime;
      emitter.frequency = lifetime / emitter.maxParticles;
    }

    play() {
      super.play();
      PIXI.Ticker.shared.add(this.updateViewport, this);
    }

    stop() {
      PIXI.Ticker.shared.remove(this.updateViewport, this);
      super.stop();
    }

    destroy(...args) {
      PIXI.Ticker.shared.remove(this.updateViewport, this);
      super.destroy(...args);
    }
  }

  // Mistral uses Foundry's leaf particles, but they now rush sideways rather
  // than drifting lazily downward as they do in Champ herbu.
  class LobiaWindLeaves extends foundry.canvas.containers.AutumnLeavesWeatherEffect {
    static LEAF_CONFIG = (() => {
      const config = foundry.utils.deepClone(super.LEAF_CONFIG);
      config.behaviors.find(behavior => behavior.type === "moveSpeed").config.speed.list = [
        { time: 0, value: 180 }, { time: 1, value: 280 }
      ];
      const rotation = config.behaviors.find(behavior => behavior.type === "rotation").config;
      rotation.minStart = 185;
      rotation.maxStart = 220;
      return config;
    })();
  }

  for (const weather of LOBIA_WEATHERS) {
    const [base, adjustments] = PRESETS[weather.key];
    const preset = CONFIG.weatherEffects[base];
    CONFIG.weatherEffects[weatherId(weather.key)] = {
      id: weatherId(weather.key),
      label: `LOBIA.Weather.${weather.key}`,
      filter: ["mistral", "champ-herbu"].includes(weather.key)
        ? { ...preset.filter, enabled: false } : preset.filter,
      effects: (["pluie", "orage", "zenith", "champ-magnetique", "pluie-de-meteores", "neige", "grele"]
        .includes(weather.key) ? [] : preset.effects).map(effect => ({
        ...effect,
        id: `${weatherId(weather.key)}-${effect.id}`,
        effectClass: weather.key === "mistral" ? LobiaWindLeaves : effect.effectClass,
        config: { ...effect.config, ...adjustments }
      }))
    };
    if (weather.key === "pluie" || weather.key === "orage") {
      CONFIG.weatherEffects[weatherId(weather.key)].effects.push({
        id: `${weatherId(weather.key)}-rain`,
        effectClass: LobiaRainDrops,
        config: { storm: weather.key === "orage" }
      });
    }
    if (weather.key === "brume") CONFIG.weatherEffects[weatherId(weather.key)].effects.push({
      id: `${weatherId(weather.key)}-clouds`, effectClass: LobiaMistClouds
    });
    if (weather.key === "champ-de-purete") CONFIG.weatherEffects[weatherId(weather.key)].effects.push({
      id: `${weatherId(weather.key)}-fairies`, effectClass: LobiaFairies
    });
    if (weather.key === "champ-herbu") CONFIG.weatherEffects[weatherId(weather.key)].effects.push({
      id: `${weatherId(weather.key)}-grass`, effectClass: LobiaGrass
    });
    if (weather.key === "champ-magnetique") {
      CONFIG.weatherEffects[weatherId(weather.key)].effects.push({
        id: `${weatherId(weather.key)}-waves`,
        effectClass: shaders.WeatherShaderEffect,
        shaderClass: LobiaMagneticShader,
        blendMode: PIXI.BLEND_MODES.SCREEN
      });
    }
    if (weather.key === "pluie-de-meteores") {
      CONFIG.weatherEffects[weatherId(weather.key)].effects.push({
        id: `${weatherId(weather.key)}-asteroids`, effectClass: LobiaMeteorFall
      });
    }
    if (weather.key === "neige" || weather.key === "grele") {
      CONFIG.weatherEffects[weatherId(weather.key)].effects.push({
        id: `${weatherId(weather.key)}-flakes`,
        effectClass: LobiaSnowflakes,
        config: { hail: weather.key === "grele", large: false }
      });
      if (weather.key === "grele") CONFIG.weatherEffects[weatherId(weather.key)].effects.push({
        id: `${weatherId(weather.key)}-large-flakes`,
        effectClass: LobiaSnowflakes,
        config: { hail: true, large: true }
      });
    }
    if (weather.key === "orage" || weather.key === "zenith") {
      CONFIG.weatherEffects[weatherId(weather.key)].effects.push({
        id: `${weatherId(weather.key)}-${weather.key === "orage" ? "lightning" : "sunlight"}`,
        effectClass: shaders.WeatherShaderEffect,
        shaderClass: weather.key === "orage" ? LobiaLightningShader : LobiaSunlightShader,
        blendMode: PIXI.BLEND_MODES.SCREEN
      });
    }
    if (ATMOSPHERES[weather.key]) CONFIG.weatherEffects[weatherId(weather.key)].effects.push({
      id: `${weatherId(weather.key)}-atmosphere`,
      effectClass: shaders.WeatherShaderEffect,
      shaderClass: ATMOSPHERES[weather.key],
      blendMode: weather.key === "nuit" ? PIXI.BLEND_MODES.NORMAL : PIXI.BLEND_MODES.SCREEN
    });
    if (MOTES[weather.key]) CONFIG.weatherEffects[weatherId(weather.key)].effects.push({
      id: `${weatherId(weather.key)}-motes`,
      effectClass: LobiaWeatherMotes,
      config: { color: MOTES[weather.key], wind: weather.key === "tempete-de-sable" }
    });
  }
}

/** GM shortcut in the Lighting controls; the saved Scene weather syncs to all clients. */
export function addWeatherControl(controls) {
  if (!game.user.isGM || !controls.lighting) return;
  controls.lighting.tools.lobiaWeather = {
    name: "lobiaWeather",
    title: "LOBIA.Weather.button",
    icon: "fa-solid fa-cloud-sun-rain",
    order: 5,
    button: true,
    onChange: () => chooseSceneWeather()
  };
}

export async function chooseSceneWeather() {
  const scene = canvas.scene;
  if (!game.user.isGM || !scene) return;
  const escape = foundry.utils.escapeHTML;
  const options = [
    `<option value="">${escape(game.i18n.localize("LOBIA.Weather.none"))}</option>`,
    ...LOBIA_WEATHERS.map(weather => {
      const id = weatherId(weather.key);
      const selected = scene.weather === id ? " selected" : "";
      return `<option value="${id}"${selected}>${escape(game.i18n.localize(`LOBIA.Weather.${weather.key}`))}</option>`;
    })
  ].join("");
  const selection = await foundry.applications.api.DialogV2.wait({
    window: { title: "LOBIA.Weather.button" },
    content: `<div class="form-group"><label for="lobia-scene-weather">${escape(game.i18n.localize("LOBIA.Weather.choose"))}</label>`
      + `<select id="lobia-scene-weather" name="weather">${options}</select></div>`,
    buttons: [
      { action: "apply", label: "LOBIA.Weather.apply", default: true,
        callback: (_event, button) => button.form.elements.weather.value },
      { action: "cancel", label: "Cancel", callback: () => null }
    ]
  });
  if (selection === null || selection === undefined) return;
  if (canvas.scene !== scene) return;
  if (selection && !LOBIA_WEATHERS.some(weather => weatherId(weather.key) === selection)) return;
  if (scene.weather === selection) return;
  try {
    await scene.update({ weather: selection });
  } catch (error) {
    console.error("Lobia | Could not set scene weather", error);
    ui.notifications.error(game.i18n.format("LOBIA.Weather.failed", { error: error.message }));
  }
}
