import { cp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const projectRoot = resolve(import.meta.dirname, "..");
const sourceRoot = resolve(projectRoot, "src");
const distRoot = resolve(projectRoot, "dist");
const assetsRoot = resolve(projectRoot, "dist", "assets");
const storageJsonParseModule = resolve(sourceRoot, "ui", "json-parse.js");

await mkdir(assetsRoot, { recursive: true });

for (const entry of await readdir(sourceRoot)) {
  const destination = resolve(assetsRoot, entry);
  await rm(destination, { force: true, recursive: true });
  await cp(resolve(sourceRoot, entry), destination, {
    recursive: true,
    filter: (source) =>
      !source.endsWith(".js") || resolve(source) === storageJsonParseModule,
  });
}

const storageHtml = await readFile(
  resolve(projectRoot, "storage.html"),
  "utf8",
);
await writeFile(
  resolve(distRoot, "storage.html"),
  storageHtml
    .replaceAll("./src/ui/assets/", "./assets/ui/assets/")
    .replaceAll("./src/ui/json-parse.js", "./assets/ui/json-parse.js"),
);
