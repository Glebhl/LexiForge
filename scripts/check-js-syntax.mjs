import { readdir } from "node:fs/promises";
import { extname, join } from "node:path";
import { spawn } from "node:child_process";

const root = process.cwd();
const ignoredDirectories = new Set([".git", "node_modules", "dist", ".vite"]);

async function collectJavaScriptFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    if (ignoredDirectories.has(entry.name)) {
      continue;
    }

    const path = join(directory, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await collectJavaScriptFiles(path)));
      continue;
    }

    if (extname(entry.name) === ".js" || extname(entry.name) === ".mjs") {
      files.push(path);
    }
  }

  return files;
}

function checkFile(path) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ["--check", path], {
      stdio: "inherit",
    });

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`Syntax check failed for ${path}`));
    });
  });
}

const files = await collectJavaScriptFiles(root);

for (const file of files) {
  await checkFile(file);
}
