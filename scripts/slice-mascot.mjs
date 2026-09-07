import sharp from "sharp";
import { mkdirSync } from "fs";
import { join } from "path";

const SRC = "public/mascot-collage.png";
const OUT = "public/mascot";
const NAMES = ["write", "read", "triumph", "work", "reward", "think", "sleep", "analyze"];

mkdirSync(OUT, { recursive: true });

const meta = await sharp(SRC).metadata();
const { width, height } = meta;

const cols = 4;
const rows = 2;
const tileW = Math.floor(width / cols);
const tileH = Math.floor(height / rows);

// Crop bottom ~21% to remove the baked-in label text
const cropBottom = Math.floor(tileH * 0.21);
const cropH = tileH - cropBottom;

for (let r = 0; r < rows; r++) {
  for (let c = 0; c < cols; c++) {
    const idx = r * cols + c;
    const name = NAMES[idx];
    await sharp(SRC)
      .extract({ left: c * tileW, top: r * tileH, width: tileW, height: cropH })
      .toFile(join(OUT, `${name}.png`));
    console.log(`✓ ${name}.png  (${tileW}×${cropH})`);
  }
}

console.log("Done — labels cropped out.");
