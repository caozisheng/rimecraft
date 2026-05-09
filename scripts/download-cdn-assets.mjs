#!/usr/bin/env node
import { createWriteStream, existsSync, mkdirSync } from "fs";
import { dirname, join } from "path";
import { pipeline } from "stream/promises";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, "..", "apps", "web", "public", "assets");

const ASSETS = [
  "demoscene/star.png",
  "games/asteroids/asteroid1.png",
  "games/asteroids/asteroid2.png",
  "games/asteroids/asteroid3.png",
  "games/breakout/ball1.png",
  "particles/blue.png",
  "particles/bubble.png",
  "particles/flares.png",
  "particles/green.png",
  "particles/red.png",
  "particles/white.png",
  "particles/yellow.png",
  "skies/clouds.png",
  "skies/deepblue.png",
  "skies/gradient13.png",
  "skies/sky1.png",
  "skies/sky2.png",
  "skies/sky3.png",
  "skies/sky4.png",
  "skies/sky5.png",
  "skies/space1.png",
  "skies/space2.png",
  "skies/space3.png",
  "skies/space4.png",
  "skies/starfield.png",
  "skies/sunset.png",
  "skies/underwater1.png",
  "skies/underwater2.png",
  "sprites/apple.png",
  "sprites/aqua_ball.png",
  "sprites/arrow.png",
  "sprites/asteroids_ship.png",
  "sprites/beball1.png",
  "sprites/block.png",
  "sprites/blue_ball.png",
  "sprites/bomb.png",
  "sprites/bullets/bullet1.png",
  "sprites/bullets/bullet11.png",
  "sprites/bullets/bullet2.png",
  "sprites/bullets/bullet5.png",
  "sprites/bullets/bullet7.png",
  "sprites/bunny.png",
  "sprites/cake.png",
  "sprites/car.png",
  "sprites/car90.png",
  "sprites/carrot.png",
  "sprites/chick.png",
  "sprites/clown.png",
  "sprites/coin.png",
  "sprites/cokecan.png",
  "sprites/crate.png",
  "sprites/diamond.png",
  "sprites/donut.png",
  "sprites/dude.png",
  "sprites/explosion.png",
  "sprites/eyes.png",
  "sprites/firstaid.png",
  "sprites/flectrum.png",
  "sprites/gem.png",
  "sprites/ghost.png",
  "sprites/green_ball.png",
  "sprites/healthbar.png",
  "sprites/hotdog.png",
  "sprites/lemming.png",
  "sprites/lollipop.png",
  "sprites/longarrow.png",
  "sprites/melon.png",
  "sprites/metalface78x92.png",
  "sprites/mine.png",
  "sprites/mushroom.png",
  "sprites/mushroom2.png",
  "sprites/orb-blue.png",
  "sprites/orb-green.png",
  "sprites/orb-red.png",
  "sprites/pangball.png",
  "sprites/pineapple.png",
  "sprites/platform.png",
  "sprites/purple_ball.png",
  "sprites/red_ball.png",
  "sprites/saw.png",
  "sprites/shinyball.png",
  "sprites/ship.png",
  "sprites/shmup-bullet.png",
  "sprites/shmup-ship.png",
  "sprites/shmup-ship2.png",
  "sprites/skull.png",
  "sprites/snake.png",
  "sprites/space-baddie.png",
  "sprites/spaceman.png",
  "sprites/splat.png",
  "sprites/thrust_ship.png",
  "sprites/thrust_ship2.png",
  "sprites/tomato.png",
  "sprites/ufo.png",
  "sprites/wabbit.png",
  "sprites/wasp.png",
  "sprites/wizball.png",
  "sprites/yellow_ball.png",
];

const CDN_BASE = "https://labs.phaser.io/assets/";
const CONCURRENCY = 8;

async function download(assetPath) {
  const url = CDN_BASE + assetPath;
  const dest = join(OUT_DIR, assetPath);

  if (existsSync(dest)) return { path: assetPath, status: "skip" };

  mkdirSync(dirname(dest), { recursive: true });

  const res = await fetch(url);
  if (!res.ok) return { path: assetPath, status: `FAIL ${res.status}` };

  await pipeline(res.body, createWriteStream(dest));
  return { path: assetPath, status: "ok" };
}

async function main() {
  console.log(`Downloading ${ASSETS.length} assets to ${OUT_DIR}...`);
  mkdirSync(OUT_DIR, { recursive: true });

  let done = 0;
  let failed = 0;
  const queue = [...ASSETS];

  async function worker() {
    while (queue.length > 0) {
      const asset = queue.shift();
      const result = await download(asset);
      done++;
      if (result.status === "ok") {
        process.stdout.write(`\r  [${done}/${ASSETS.length}] ${asset}`);
      } else if (result.status === "skip") {
        // already exists
      } else {
        console.error(`\n  FAILED: ${asset} — ${result.status}`);
        failed++;
      }
    }
  }

  const workers = Array.from({ length: CONCURRENCY }, () => worker());
  await Promise.all(workers);

  console.log(`\nDone. ${done - failed} downloaded, ${failed} failed.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
