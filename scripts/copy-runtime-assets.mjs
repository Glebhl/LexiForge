import { cp, mkdir, readdir, rm } from "node:fs/promises";
import { resolve } from "node:path";

const projectRoot = resolve(import.meta.dirname, "..");
const sourceRoot = resolve(projectRoot, "src");
const assetsRoot = resolve(projectRoot, "dist", "assets");

await mkdir(assetsRoot, { recursive: true });

for (const entry of await readdir(sourceRoot)) {
  const destination = resolve(assetsRoot, entry);
  await rm(destination, { force: true, recursive: true });
  await cp(resolve(sourceRoot, entry), destination, { recursive: true });
}
