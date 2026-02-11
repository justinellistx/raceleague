import fs from "fs";
import path from "path";

const projectRoot = process.cwd();
const photosDir = path.join(projectRoot, "public", "drivers-photos");
const outFile = path.join(photosDir, "manifest.json");

const allowed = new Set([".png", ".jpg", ".jpeg", ".webp", ".avif"]);

function main() {
  if (!fs.existsSync(photosDir)) {
    console.log("❌ public/drivers-photos folder not found.");
    return;
  }

  const files = fs.readdirSync(photosDir);
  const manifest = {};

  for (const file of files) {
    const ext = path.extname(file).toLowerCase();
    if (!allowed.has(ext)) continue;

    const id = path.basename(file, ext);

    // prefer png if duplicates
    if (manifest[id] && ext !== ".png") continue;

    manifest[id] = `/drivers-photos/${file}`;
  }

  fs.writeFileSync(outFile, JSON.stringify(manifest, null, 2));
  console.log(`✅ Driver photo manifest created with ${Object.keys(manifest).length} entries.`);
}

main();

