#!/usr/bin/env node
/**
 * Genera un :root con variables CSS a partir de tokens.ia.json
 *
 * Uso:
 *   node build-tokens-css.js --in ./tokens.ia.json --out ./dist/tokens.css --prefix kushki
 *
 * Opcionales:
 *   --in     Ruta del JSON de tokens (default: ./tokens.ia.json)
 *   --out    Ruta del CSS de salida (default: ./dist/tokens.css)
 *   --prefix Prefijo de las custom props (default: ds)
 */

const fs = require('fs');
const path = require('path');

// ───────────────────────────────────────────────────────────────────────────────
// CLI
// ───────────────────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const getArg = (flag, fallback) => {
  const i = args.indexOf(flag);
  return i !== -1 && args[i + 1] ? args[i + 1] : fallback;
};
const IN_FILE   = path.resolve(getArg('--in', './tokens.ia.json'));
const OUT_FILE  = path.resolve(getArg('--out', './dist/tokens.css'));
const PREFIX    = (getArg('--prefix', 'ds') || 'ds').trim();

// ───────────────────────────────────────────────────────────────────────────────
// Utilidades
// ───────────────────────────────────────────────────────────────────────────────
const isPlainObject = (v) => Object.prototype.toString.call(v) === '[object Object]';
const toKebab = (s) => String(s).replace(/([a-z0-9])([A-Z])/g, '$1-$2').replace(/[_\s]+/g,'-').toLowerCase();

// Convierte ruta de claves a nombre de variable CSS con prefijo
const pathToVar = (segments) => `--${PREFIX}-${segments.map(toKebab).join('-')}`;

// Une arrays de box-shadows o valores múltiples
const joinArrayValue = (arr) => {
  // Si es array de objetos de boxShadow (dropShadow entries), intenta “x y blur color”
  if (arr.length && isPlainObject(arr[0]) && ('type' in arr[0])) {
    const parts = arr.map(entry => {
      const color = ('color' in entry) ? entry.color : '';
      const x     = ('x' in entry) ? entry.x : '0';
      const y     = ('y' in entry) ? entry.y : '0';
      const blur  = ('blur' in entry) ? entry.blur : '0';
      const spread= ('spread' in entry) ? entry.spread : '0';
      // “type” puede ser “dropShadow”, CSS usa “box-shadow”
      return `${x} ${y} ${blur}${spread ? ' ' + spread : ''} ${color}`.trim();
    });
    return parts.join(', ');
  }
  // Si no, únelos por coma literal
  return arr.map(v => (typeof v === 'string' ? v : JSON.stringify(v))).join(', ');
};

// Obtiene valor crudo de un nodo “tipo tipografía” y lo expande en propiedades
const explodeTypography = (obj) => {
  // Mapea nombres comunes del token a propiedades CSS
  const map = {
    fontFamily: 'font-family',
    fontWeight: 'font-weight',
    fontSize: 'font-size',
    lineHeight: 'line-height',
    letterSpacing: 'letter-spacing',
    textDecoration: 'text-decoration',
    textCase: 'text-transform',
    paragraphSpacing: 'paragraph-spacing',
    paragraphIndent: 'text-indent'
  };
  const out = {};
  for (const k of Object.keys(obj)) {
    const cssKey = map[k];
    if (!cssKey) continue;
    out[cssKey] = obj[k];
  }
  return out;
};

// ───────────────────────────────────────────────────────────────────────────────
// Carga y resolución de referencias
// ───────────────────────────────────────────────────────────────────────────────
if (!fs.existsSync(IN_FILE)) {
  console.error(`❌ No se encontró el archivo de entrada: ${IN_FILE}`);
  process.exit(1);
}

const tokens = JSON.parse(fs.readFileSync(IN_FILE, 'utf8'));

// Genera índice plano por rutas (ej: primitive.color.blue.500 → valor)
function indexTokens(obj, basePath = [], index = {}) {
  if (isPlainObject(obj)) {
    // Convención típica: { value, type } como hoja
    if ('value' in obj && Object.keys(obj).every(k => ['value','type','description','$type'].includes(k))) {
      index[basePath.join('.')] = obj.value;
      return index;
    }
    for (const k of Object.keys(obj)) {
      indexTokens(obj[k], basePath.concat(k), index);
    }
  } else if (Array.isArray(obj)) {
    index[basePath.join('.')] = obj; // guarda array como valor final
  } else {
    index[basePath.join('.')] = obj; // primitivo
  }
  return index;
}

// Índice de TODO el documento para resolver {referencias}
const flatIndex = indexTokens(tokens);

// Resuelve referencias dentro de strings con patrón {a.b.c}
const REF_RE = /\{([^\}]+)\}/g;

function resolveValue(raw, stack = []) {
  if (raw == null) return raw;

  // Si es número, boolean, null → retornar tal cual
  if (typeof raw !== 'string') {
    if (Array.isArray(raw)) {
      // resolver elementos
      return raw.map(v => resolveValue(v, stack));
    }
    if (isPlainObject(raw)) {
      // caso tipografía u objetos compuestos → resuelve recursivo
      const out = {};
      for (const k of Object.keys(raw)) {
        out[k] = resolveValue(raw[k], stack);
      }
      return out;
    }
    return raw;
  }

  // Reemplazo de referencias en strings
  return raw.replace(REF_RE, (_, pathRef) => {
    const key = pathRef.trim();
    if (stack.includes(key)) {
      console.warn(`⚠️ Ciclo de referencias detectado: ${stack.join(' -> ')} -> ${key}`);
      return raw; // deja sin resolver
    }
    if (!(key in flatIndex)) {
      console.warn(`⚠️ Referencia no resuelta: {${key}}`);
      return `{${key}}`;
    }
    const val = resolveValue(flatIndex[key], stack.concat(key));
    if (typeof val === 'object') {
      // Si el valor resulta ser objeto/array, serialízalo a string razonable
      if (Array.isArray(val)) return joinArrayValue(val);
      return JSON.stringify(val);
    }
    return String(val);
  });
}

// ───────────────────────────────────────────────────────────────────────────────
// Aplanado a variables CSS
// ───────────────────────────────────────────────────────────────────────────────
const vars = {}; // { cssVarName: cssValue }

function walk(node, pathSegs = []) {
  if (node == null) return;

  // Si es hoja con convención { value, type? }, tomar value y resolver referencias
  if (isPlainObject(node) && 'value' in node && Object.keys(node).every(k => ['value','type','description','$type'].includes(k))) {
    let val = resolveValue(node.value);
    const cssVar = pathToVar(pathSegs);
    if (Array.isArray(val)) val = joinArrayValue(val);
    vars[cssVar] = val;
    return;
  }

  // Tipografías como objetos “value: { fontFamily, fontSize, ... }”
  if (isPlainObject(node) && 'value' in node && isPlainObject(node.value) && node.type === 'typography') {
    const expanded = explodeTypography(resolveValue(node.value));
    for (const [prop, v] of Object.entries(expanded)) {
      const cssVar = pathToVar(pathSegs.concat(prop));
      vars[cssVar] = v;
    }
    return;
  }

  // Objetos “puros” → seguir descendiendo
  if (isPlainObject(node)) {
    for (const [k, v] of Object.entries(node)) {
      // salta metadatos que no se quieren exportar
      if (k === '$schema') continue;
      if (k === '$extensions') continue;
      if (k === 'metadata') continue;

      // Caso “tipografía sin type” pero donde el value sea un objeto con claves tipográficas
      if (isPlainObject(v) && 'value' in v && isPlainObject(v.value) && !('type' in v) && looksLikeTypography(v.value)) {
        const expanded = explodeTypography(resolveValue(v.value));
        for (const [prop, val] of Object.entries(expanded)) {
          const cssVar = pathToVar(pathSegs.concat(k, prop));
          vars[cssVar] = val;
        }
        continue;
      }

      walk(v, pathSegs.concat(k));
    }
    return;
  }

  // Arrays como hojas
  if (Array.isArray(node)) {
    const cssVar = pathToVar(pathSegs);
    vars[cssVar] = joinArrayValue(resolveValue(node));
    return;
  }

  // Primitivo simple
  const cssVar = pathToVar(pathSegs);
  vars[cssVar] = resolveValue(node);
}

function looksLikeTypography(obj) {
  const keys = Object.keys(obj);
  const known = ['fontFamily','fontWeight','fontSize','lineHeight','letterSpacing','textDecoration','textCase','paragraphSpacing','paragraphIndent'];
  return keys.some(k => known.includes(k));
}

// Entradas top-level que típicamente queremos pasar
const rootsToExport = [
  'primitive',
  'semantic',
  'component',
  'patterns',
  'assets' // por si quieres exponer urls como vars
];

for (const root of rootsToExport) {
  if (tokens[root]) walk(tokens[root], [root]);
}

// ───────────────────────────────────────────────────────────────────────────────
// Salida CSS
// ───────────────────────────────────────────────────────────────────────────────
const ensureDir = (p) => fs.mkdirSync(path.dirname(p), { recursive: true });

function buildCSS(varsObj) {
  const lines = [':root {'];
  // ordenar para estabilidad (opcional)
  const entries = Object.entries(varsObj).sort(([a],[b]) => a.localeCompare(b));
  for (const [k, v] of entries) {
    lines.push(`  ${k}: ${v};`);
  }
  lines.push('}');
  lines.push(''); // newline final
  return lines.join('\n');
}

ensureDir(OUT_FILE);
const css = buildCSS(vars);
fs.writeFileSync(OUT_FILE, css, 'utf8');

console.log(`✅ CSS generado en: ${OUT_FILE}`);
console.log(`🔎 Total variables: ${Object.keys(vars).length}`);
