import assert from "node:assert/strict";
import { stat } from "node:fs/promises";
import { LOBIA_WEATHERS } from "../../module/data/weather-data.mjs";
import { registerLobiaWeather, addWeatherControl, chooseSceneWeather } from "../../module/canvas/weather.mjs";

const names = Object.fromEntries(LOBIA_WEATHERS.map(w => [`LOBIA.Weather.${w.key}`, w.name]));
for (const lang of ["fr", "en"]) {
  const strings = (await import(`../../lang/${lang}.json`, { with: { type: "json" } })).default;
  for (const key of Object.keys(names)) assert.ok(strings[key], `${lang}: ${key}`);
}

globalThis.CONFIG = { weatherEffects: Object.fromEntries(["fog", "rain", "rainStorm", "snow", "blizzard", "leaves"]
  .map(key => [key, { filter: { enabled: false }, effects: [{ id: key, config: { speed: 1 } }] }])) };
CONFIG.weatherEffects.leaves.filter.enabled = true;
const ticking = new Set();
globalThis.PIXI = { BLEND_MODES: { SCREEN: 1, NORMAL: 0 }, Sprite: { from: texture => ({
  texture, anchor: { set(x, y) { this.x = x; this.y = y; } },
  position: { set(x, y) { this.x = x; this.y = y; } },
  scale: { set(value) { this.value = value; } }
}) }, Ticker: { shared: {
  add: (fn, context) => ticking.add(context), remove: (fn, context) => ticking.delete(context)
} } };
globalThis.game = { user: { isGM: true }, i18n: { localize: key => names[key] ?? key, format: key => key } };
globalThis.foundry = {
  utils: { escapeHTML: value => value, deepClone: value => structuredClone(value) }, applications: { api: {} },
  canvas: {
    rendering: { shaders: { AbstractWeatherShader: class {
      static FRAGMENT_HEADER = "uniform float time; varying vec2 vStaticUvs;";
      static COMPUTE_MASK = "float mask = 1.0;";
      constructor() { Object.keys(this.constructor.defaultUniforms); }
    }, WeatherShaderEffect: class {} } },
    containers: { ParticleEffect: class {
    constructor(config) { this.children = []; this.emitters = this.getParticleEmitters(config); }
    addChild(sprite) { this.children.push(sprite); }
    createEmitter(config) {
      this.emitterConfig = config;
      return {
        maxParticles: config.maxParticles, frequency: config.frequency,
        updateOwnerPos(x, y) { this.ownerPos = { x, y }; },
        getBehavior(type) {
          return type === "spawnShape" ? { shape: config.behaviors.find(b => b.type === type).config.data } : null;
        },
        resetPositionTracking() { this.positionReset = true; }
      };
    }
    play() {}
    stop() {}
    destroy() {}
  }, AutumnLeavesWeatherEffect: class {
    static LEAF_CONFIG = { behaviors: [
      { type: "moveSpeed", config: { speed: { list: [{ time: 0, value: 20 }] } } },
      { type: "rotation", config: { minStart: 0, maxStart: 365 } }
    ] };
  } }
  }
};
globalThis.ui = { notifications: { error: error => { throw new Error(error); } } };
let updates = [];
const scene = { weather: "", update: async data => { updates.push(data); scene.weather = data.weather; } };
globalThis.canvas = {
  scene, dimensions: { sceneRect: { x: 0, y: 0, width: 2000, height: 1200 }, size: 100 },
  screenDimensions: [1200, 800],
  canvasCoordinatesFromClient: ({ x, y }) => ({ x: x + 100, y: y + 200 })
};
let choice;
foundry.applications.api.DialogV2 = { wait: async config => {
  assert.match(config.content, /Champ magnétique/);
  assert.match(config.content, /Mistral/);
  return choice;
} };

registerLobiaWeather();
for (const weather of LOBIA_WEATHERS) {
  const effect = CONFIG.weatherEffects[`lobia-${weather.key}`];
  assert.equal(effect.label, `LOBIA.Weather.${weather.key}`);
  assert.ok(effect.effects.length);
  if (!["champ-de-purete", "champ-herbu", "champ-pollue", "mistral", "pluie", "orage", "brume",
    "champ-magnetique", "pluie-de-meteores", "neige", "grele"].includes(weather.key)) {
    const mote = effect.effects.find(entry => entry.id.endsWith("-motes"));
    assert.ok(mote, `${weather.key} has visible particle motion`);
    const instance = new mote.effectClass(mote.config);
    assert.equal(instance.emitterConfig.behaviors.find(behavior => behavior.type === "colorStatic")
      .config.color, `#${mote.config.color}`);
    assert.ok(!instance.emitterConfig.behaviors.some(behavior => behavior.type === "color"),
      "constant motes must not interpolate colors");
    assert.ok(instance.emitterConfig.maxParticles > 0);
    assert.ok(instance.emitterConfig.maxParticles <= 350);
  } else if (["champ-herbu", "mistral"].includes(weather.key)) {
    assert.ok(effect.effects.some(entry => entry.id.endsWith("-leaves")), `${weather.key} has leaves`);
  }
}
assert.equal(CONFIG.weatherEffects.fog.effects[0].config.speed, 1, "core presets are unchanged");
const mist = CONFIG.weatherEffects["lobia-brume"].effects;
assert.equal(mist.length, 2);
assert.equal(mist[0].config.intensity, 0.95);
assert.ok(mist[0].id.endsWith("-fog"));
const clouds = new mist[1].effectClass();
assert.equal(clouds.emitterConfig.behaviors.find(behavior => behavior.type === "textureRandom")
  .config.textures[0], "systems/lobia/assets/weather/mist.png");
assert.ok(clouds.emitterConfig.maxParticles >= 25, "mist is dense enough to see");
assert.deepEqual(clouds.emitterConfig.behaviors.find(behavior => behavior.type === "alpha")
  .config.alpha.list.map(step => step.value), [0, 0.5, 0.5, 0],
"mist clouds fade in and out");
assert.ok(clouds.emitterConfig.behaviors.find(behavior => behavior.type === "scale")
  .config.scale.list[0].value >= 0.4, "mist uses visible full-size smoke art");
const magnetic = CONFIG.weatherEffects["lobia-champ-magnetique"].effects;
assert.equal(magnetic.length, 1);
assert.ok(magnetic[0].shaderClass.fragmentShader.includes("radius * 74.0 - time * 2.3"));
const MagneticShader = magnetic[0].shaderClass;
new MagneticShader();
const motifs = {
  "champ-de-purete": "glades", "champ-pollue": "sludge",
  "champ-psychique": "iris", "tempete-de-sable": "gust", secheresse: "shimmer",
  "porte-des-morts": "jambs", nuit: "star", mistral: "stream"
};
const shaderSources = new Set();
for (const [key, motif] of Object.entries(motifs)) {
  const effect = CONFIG.weatherEffects[`lobia-${key}`].effects.find(e => e.id.endsWith("-atmosphere"));
  assert.ok(effect, `${key} has a distinct scene overlay`);
  assert.ok(effect.shaderClass.fragmentShader.includes(motif), `${key} depicts ${motif}`);
  assert.ok(effect.shaderClass.fragmentShader.includes("mask * alpha"), `${key} honors the weather mask`);
  assert.equal(effect.blendMode, key === "nuit" ? PIXI.BLEND_MODES.NORMAL : PIXI.BLEND_MODES.SCREEN);
  new effect.shaderClass();
  shaderSources.add(effect.shaderClass.fragmentShader);
}
assert.equal(shaderSources.size, Object.keys(motifs).length, "each remaining weather has unique art");
const purity = CONFIG.weatherEffects["lobia-champ-de-purete"].effects
  .find(effect => effect.id.endsWith("-atmosphere")).shaderClass.fragmentShader;
const purityEffects = CONFIG.weatherEffects["lobia-champ-de-purete"].effects;
assert.ok(purityEffects.some(effect => effect.id.endsWith("-fog")
  && effect.config.intensity === 0.25), "purity has a soft fog base like the polluted field");
assert.ok(!purityEffects.some(effect => effect.id.endsWith("-leaves")), "fairy fog replaces leaves");
assert.ok(purity.includes("fairy * glades"), "purity has flowing pastel glades");
const fairyEffect = purityEffects.find(effect => effect.id.endsWith("-fairies"));
assert.ok(fairyEffect, "purity has moving fairy sprites");
const fairies = new fairyEffect.effectClass().emitterConfig;
assert.ok(fairies.maxParticles >= 5 && fairies.maxParticles <= 22);
assert.equal(fairies.behaviors.find(b => b.type === "textureRandom").config.textures[0],
  "systems/lobia/assets/weather/fairy.svg");
assert.equal(fairies.behaviors.find(b => b.type === "rotation").config.maxStart, 360,
  "fairies fly in varied directions");
assert.ok(fairies.behaviors.find(b => b.type === "scaleStatic").config.max <= 0.45,
  "fairies retain a small sprite size");
assert.ok(!purity.includes("0.55, 1.0, 0.84"), "purity no longer uses mint green");
assert.ok((await stat(new URL("../../assets/weather/fairy.svg", import.meta.url))).size > 100,
  "fairy art is available");
const polluted = CONFIG.weatherEffects["lobia-champ-pollue"].effects;
assert.ok(!polluted.some(effect => effect.id.endsWith("-motes")), "no rising poison dots");
assert.ok(polluted.find(effect => effect.id.endsWith("-atmosphere"))
  .shaderClass.fragmentShader.includes("mix(vec3(0.56, 0.12, 0.73), vec3(0.53, 0.9, 0.18)"),
"poison pools mix purple and green");
const door = CONFIG.weatherEffects["lobia-porte-des-morts"].effects
  .find(effect => effect.id.endsWith("-atmosphere")).shaderClass.fragmentShader;
for (const detail of ["jambs", "lintel", "threshold", "panel", "knob"]) {
  assert.ok(door.includes(detail), `the spectral door has ${detail}`);
}
const sand = CONFIG.weatherEffects["lobia-tempete-de-sable"].effects
  .find(effect => effect.id.endsWith("-motes"));
const sandEmitter = new sand.effectClass(sand.config).emitterConfig;
assert.ok(sandEmitter.behaviors.find(b => b.type === "moveSpeed").config.speed.list[0].value >= 200,
  "sand blows hard from the outset");
assert.ok(sandEmitter.behaviors.find(b => b.type === "rotation").config.maxStart <= 210,
  "sand travels sideways rather than in every direction");
assert.ok(sandEmitter.lifetime.max <= 3, "windblown grit does not linger");
const meteors = CONFIG.weatherEffects["lobia-pluie-de-meteores"].effects;
assert.equal(meteors.length, 1);
const asteroid = new meteors[0].effectClass().emitterConfig;
assert.ok(asteroid.maxParticles >= 2 && asteroid.maxParticles <= 5,
  "meteor showers should have a few asteroids, slightly more than before");
assert.ok(asteroid.behaviors.some(b => b.type === "moveSpeedStatic"));
assert.ok(asteroid.behaviors.find(b => b.type === "scaleStatic").config.min >= 0.48,
  "asteroids are substantially larger");
assert.ok(asteroid.behaviors.find(b => b.type === "rotation").config.maxSpeed > 0,
  "asteroids tumble as they fall");
assert.deepEqual(asteroid.behaviors.find(behavior => behavior.type === "textureRandom").config.textures,
  ["systems/lobia/assets/weather/meteor-1.png", "systems/lobia/assets/weather/meteor-2.png"]);
const asteroidSpawn = asteroid.behaviors.find(behavior => behavior.type === "spawnShape").config.data;
assert.deepEqual({ x: asteroidSpawn.x, y: asteroidSpawn.y, w: asteroidSpawn.w },
  { x: 100, y: 140, w: 1200 }, "a few asteroids enter from above the viewport");
for (const name of ["mist.png", "meteor-1.png", "meteor-2.png"]) {
  assert.ok((await stat(new URL(`../../assets/weather/${name}`, import.meta.url))).size > 1000);
}
const snow = CONFIG.weatherEffects["lobia-neige"].effects;
const hail = CONFIG.weatherEffects["lobia-grele"].effects;
assert.equal(snow.length, 1);
assert.equal(hail.length, 2);
const snowEffect = new snow[0].effectClass(snow[0].config);
const snowEmitter = snowEffect.emitterConfig;
const hailEmitter = new hail[0].effectClass(hail[0].config).emitterConfig;
const bigHailEmitter = new hail[1].effectClass(hail[1].config).emitterConfig;
for (const emitter of [snowEmitter, hailEmitter, bigHailEmitter]) {
  assert.deepEqual(emitter.behaviors.find(behavior => behavior.type === "textureRandom")
    .config.textures, ["ui/particles/snow.png"]);
  assert.ok(emitter.maxParticles <= 400);
  assert.equal(emitter.behaviors.find(behavior => behavior.type === "spawnShape").config.data.h, 0,
    "snow and hail spawn on the top edge, not across the scene");
  assert.equal(emitter.behaviors.find(behavior => behavior.type === "spawnShape").config.data.w, 1200);
  assert.equal(emitter.behaviors.find(behavior => behavior.type === "rotation").config.minStart, 90);
  assert.ok(!emitter.behaviors.some(b => ["moveSpeed", "scale", "alpha"].includes(b.type)),
    "snow avoids interpolation beyond a particle's lifetime");
  assert.equal(emitter.lifetime.min * emitter.behaviors.find(behavior => behavior.type === "moveSpeedStatic")
    .config.min, 800, "flakes die at the bottom of the viewport");
}
assert.deepEqual(snowEffect.emitters[0].ownerPos, { x: 100, y: 200 });
snowEffect.play();
assert.ok(ticking.has(snowEffect));
canvas.canvasCoordinatesFromClient = ({ x, y }) => ({ x: x + 150, y: y + 250 });
snowEffect.updateViewport();
assert.deepEqual(snowEffect.emitters[0].ownerPos, { x: 150, y: 250 });
assert.ok(snowEffect.emitters[0].positionReset, "panning does not streak the spawn line");
canvas.canvasCoordinatesFromClient = ({ x, y }) => ({ x: x / 2 + 150, y: y / 2 + 250 });
snowEffect.updateViewport();
assert.equal(snowEmitter.behaviors.find(behavior => behavior.type === "spawnShape").config.data.w, 600);
assert.equal(snowEffect.emitters[0].maxLifetime * 60, 400,
  "zooming still ends snow at the screen bottom");
snowEffect.destroy();
assert.ok(!ticking.has(snowEffect), "ticker is removed when the effect is destroyed");
const speed = emitter => emitter.behaviors.find(behavior => behavior.type === "moveSpeedStatic").config.min;
const scale = emitter => emitter.behaviors.find(behavior => behavior.type === "scaleStatic").config.min;
assert.ok(speed(hailEmitter) > speed(snowEmitter));
assert.ok(speed(bigHailEmitter) > speed(hailEmitter));
assert.ok(scale(bigHailEmitter) > scale(hailEmitter));
assert.equal(CONFIG.weatherEffects.snow.effects[0].config.speed, 1, "stock snow remains unchanged");
const rain = CONFIG.weatherEffects["lobia-pluie"].effects;
assert.equal(rain.length, 1);
assert.equal(rain[0].config.storm, false);
const drizzle = new rain[0].effectClass(rain[0].config);
assert.ok(snowEmitter.maxParticles < drizzle.emitterConfig.maxParticles);
assert.ok(hailEmitter.maxParticles < drizzle.emitterConfig.maxParticles);
assert.ok(drizzle.emitterConfig.maxParticles >= 160, "rain must contain many drops");
assert.ok(drizzle.emitterConfig.frequency < 0.01, "new drops spawn continuously");
assert.deepEqual(drizzle.emitterConfig.behaviors.find(behavior => behavior.type === "textureRandom")
  .config.textures, ["ui/particles/rain.png"]);
assert.equal(drizzle.emitterConfig.behaviors.find(behavior => behavior.type === "colorStatic")
  .config.color, "#c5dcff");
assert.ok(!rain.some(effect => effect.id.endsWith("-motes")), "rain should look like rain, not sparks");
const storm = CONFIG.weatherEffects["lobia-orage"].effects;
assert.equal(storm[0].config.storm, true);
assert.equal(storm[0].effectClass, rain[0].effectClass, "storm uses the same drop emitter");
const downpour = new storm[0].effectClass(storm[0].config);
assert.ok(downpour.emitterConfig.maxParticles > drizzle.emitterConfig.maxParticles);
assert.ok(storm.some(effect => effect.id.endsWith("-lightning")
  && effect.shaderClass.fragmentShader.includes("bolt")));
const LightningShader = storm.find(effect => effect.id.endsWith("-lightning")).shaderClass;
new LightningShader();
const zenith = CONFIG.weatherEffects["lobia-zenith"].effects;
assert.ok(zenith.some(effect => effect.id.endsWith("-sunlight")
  && effect.shaderClass.fragmentShader.includes("bands")));
const SunlightShader = zenith.find(effect => effect.id.endsWith("-sunlight")).shaderClass;
new SunlightShader();
assert.ok(!zenith.some(effect => effect.id.endsWith("-fog")));
const wind = CONFIG.weatherEffects["lobia-mistral"].effects[0];
assert.equal(CONFIG.weatherEffects["lobia-mistral"].filter.enabled, false,
  "mistral does not darken the scene with the stock leaf filter");
assert.equal(CONFIG.weatherEffects["lobia-champ-herbu"].filter.enabled, false,
  "grassy field does not darken the scene with the stock leaf filter");
canvas.canvasCoordinatesFromClient = ({ x, y }) => ({ x: x + 100, y: y + 200 });
const grassEntry = CONFIG.weatherEffects["lobia-champ-herbu"].effects
  .find(effect => effect.id.endsWith("-grass"));
assert.ok(grassEntry, "grass uses static sprites along the lower edge");
const grassEffect = new grassEntry.effectClass();
assert.equal(grassEffect.emitters.length, 0, "grass is not animated particles");
grassEffect.play();
assert.ok(grassEffect.children.length >= 12);
assert.equal(grassEffect.children[0].texture, "systems/lobia/assets/weather/grass.svg");
assert.equal(grassEffect.children[0].anchor.y, 1);
assert.equal(grassEffect.children[0].position.y, 1200, "grass feet rest on the scene bottom");
const firstX = grassEffect.children[0].position.x;
canvas.canvasCoordinatesFromClient = ({ x, y }) => ({ x: x + 150, y: y + 250 });
assert.equal(grassEffect.children[0].position.x, firstX);
assert.equal(grassEffect.children[0].position.y, 1200, "grass stays on the scene when panning");
canvas.canvasCoordinatesFromClient = ({ x, y }) => ({ x: x / 2 + 150, y: y / 2 + 250 });
assert.equal(grassEffect.children[0].position.y, 1200, "grass stays on the scene when zooming");
grassEffect.destroy();
canvas.canvasCoordinatesFromClient = ({ x, y }) => ({ x: x + 100, y: y + 200 });
assert.ok((await stat(new URL("../../assets/weather/grass.svg", import.meta.url))).size > 100);
assert.equal(CONFIG.weatherEffects.leaves.filter.enabled, true,
  "the stock leaves filter stays unchanged");
assert.equal(wind.effectClass.LEAF_CONFIG.behaviors.find(behavior => behavior.type === "moveSpeed")
  .config.speed.list[0].value, 180);
assert.equal(foundry.canvas.containers.AutumnLeavesWeatherEffect.LEAF_CONFIG.behaviors[0]
  .config.speed.list[0].value, 20, "grassy field leaves stay gentle");
const controls = { lighting: { tools: {} } };
addWeatherControl(controls);
assert.equal(controls.lighting.tools.lobiaWeather.button, true);

choice = "lobia-pluie";
await chooseSceneWeather();
assert.deepEqual(updates, [{ weather: choice }]);
await chooseSceneWeather();
assert.equal(updates.length, 1, "reselecting is a no-op");
choice = null;
await chooseSceneWeather();
assert.equal(updates.length, 1, "cancel preserves weather");
choice = "";
await chooseSceneWeather();
assert.equal(scene.weather, "", "clear removes the scene effect");
game.user.isGM = false;
addWeatherControl({ lighting: { tools: {} } });
choice = "lobia-orage";
await chooseSceneWeather();
assert.equal(updates.length, 2, "players cannot change weather");

console.log("Weather scene controls and effects OK");
