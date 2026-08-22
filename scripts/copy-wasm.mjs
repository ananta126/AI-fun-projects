import { copyFileSync, existsSync, mkdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = join(root, "node_modules/sql.js/dist/sql-wasm.wasm");
const destDir = join(root, "public");
const dest = join(destDir, "sql-wasm.wasm");

if (!existsSync(src)) {
  console.warn("sql.js wasm not found; run npm install first");
  process.exit(0);
}
mkdirSync(destDir, { recursive: true });
copyFileSync(src, dest);
console.log("copied sql-wasm.wasm to public/");
