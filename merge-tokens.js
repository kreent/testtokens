"use strict";
const fs = require("fs");
const path = require("path");
function parseArgs() {
  const args = process.argv.slice(2);
  const opts = {
    inDir: __dirname,
    outFile: path.resolve(process.cwd(), "tokens.ia.json"),
    files: null,
  };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--in") opts.inDir = path.resolve(process.cwd(), args[++i]);
    else if (a === "--out") opts.outFile = path.resolve(process.cwd(), args[++i]);
    else if (a === "--files") opts.files = args[++i].split(",").map(s => s.trim());
  }
  return opts;
}

const DEFAULT_FILES = [
  "ia_guidelines.json",
  "assets.json",
  "primitives.json",
  "semantic.json",
  "components/button.json",
  "components/badges.json",
  "components/chips.json",
  "components/snackbar.json",
  "components/link.json",
  "patterns/layout.json",
  "patterns/forms.json",
  "components/alerts.json",
  "components/tables.json",
  "components/sidebar.json"
];

function isObject(v) {
  return v && typeof v === "object" && !Array.isArray(v);
}

function deepMerge(target, source) {
  const result = { ...target };

  for (const key of Object.keys(source)) {
    const srcVal = source[key];
    const tgtVal = result[key];

    // Objetos → merge recursivo
    if (isObject(tgtVal) && isObject(srcVal)) {
      result[key] = deepMerge(tgtVal, srcVal);
      continue;
    }

    // Arrays → políticas
    if (Array.isArray(tgtVal) && Array.isArray(srcVal)) {
      if (key === "modes" || key === "layers") {
        // unión (evita duplicados)
        result[key] = Array.from(new Set([...tgtVal, ...srcVal]));
      } else {
        // concatenación simple (FIX del bug tipográfico)
        result[key] = [...tgtVal, ...srcVal];
      }
      continue;
    }

    // No pisar el primer $schema encontrado
    if (key === "$schema" && typeof tgtVal === "string") {
      continue;
    }

    // Sobrescribir en el resto de casos
    result[key] = srcVal;
  }

  return result;
}

function mergeFiles(inDir, files) {
  let merged = {};
  for (const rel of files) {
    const abs = path.resolve(inDir, rel);
    if (!fs.existsSync(abs)) {
      console.error(`⚠️  No se encontró: ${rel}`);
      continue;
    }
    try {
      const raw = fs.readFileSync(abs, "utf8");
      const json = JSON.parse(raw);
      merged = deepMerge(merged, json);
    } catch (e) {
      console.error(`❌ Error leyendo ${rel}: ${e.message}`);
    }
  }
  return merged;
}

(function main() {
  const opts = parseArgs();
  const files = opts.files || DEFAULT_FILES;

  console.log("📦 Origen:", opts.inDir);
  console.log("📄 Archivos:", files.join(", "));
  console.log("📤 Salida:", opts.outFile);

  const merged = mergeFiles(opts.inDir, files);

  fs.mkdirSync(path.dirname(opts.outFile), { recursive: true });
  fs.writeFileSync(opts.outFile, JSON.stringify(merged, null, 2), "utf8");

  console.log("✅ Archivo generado:", opts.outFile);
})();
