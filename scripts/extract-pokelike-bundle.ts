import { createHash } from 'node:crypto';
import {
  existsSync,
  readFileSync,
  readdirSync,
  statSync,
} from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
export const ROOT_DIR = path.resolve(SCRIPT_DIR, '..');
export const GENERATED_DIR = path.join(ROOT_DIR, 'src', 'data', 'generated');

const DECODER_OFFSET_FALLBACK = 0xc9;
const EXTRACTION_TIMEOUT_MS = 20_000;
const NEWEST_TIE_WINDOW_MS = 1_000;

const OUTPUT_FILES = {
  pokedex: 'pokedex.json',
  moves: 'move-pool.json',
  items: 'items.json',
  passiveItems: 'passive-items.json',
  usableItems: 'usable-items.json',
  typeItemMap: 'type-item-map.json',
  challenges: 'challenges.json',
  weeklyChallenges: 'weekly-challenges.json',
  nodeTypes: 'node-types.json',
  evolutions: 'evolutions.json',
  branchingEvolutions: 'branching-evolutions.json',
  legendaryIds: 'legendary-ids.json',
  gen3AbilityLines: 'gen3-ability-lines.json',
  gen3Abilities: 'gen3-abilities.json',
  stageGenRanges: 'stage-gen-ranges.json',
  stageMeta: 'stage-meta.json',
  monotypeTypes: 'monotype-types.json',
  gen3MapNames: 'gen3-map-names.json',
  gen3MapLevelRanges: 'gen3-map-level-ranges.json',
};

type JsonPrimitive = string | number | boolean | null;
type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };
type BundleResolutionMode = 'explicit' | 'html' | 'autodetect';
type UnknownRecord = Record<string, unknown>;

interface BundleCandidate {
  path: string;
  rel: string;
  mtimeMs: number;
  size: number;
  source: 'autodetect';
}

interface BundleResolution {
  mode: BundleResolutionMode;
  input?: string;
  rel: string;
  candidates?: string[];
}

export interface ResolvedBundleInput {
  bundlePath: string;
  resolution: BundleResolution;
}

interface SourceRange {
  start: number;
  end: number;
  code?: string;
  replacement?: string;
}

interface DecoderBlocks {
  xBlock: Required<Pick<SourceRange, 'start' | 'end' | 'code'>>;
  cBlock: Required<Pick<SourceRange, 'start' | 'end' | 'code'>>;
  rotation: RotationLoop;
}

interface RotationLoop {
  start: number;
  end: number;
  alias: string;
  expression: string;
  target: number;
}

interface DecodedBundleStrings {
  strings: string[];
  offset: number;
  rotations: number;
  blocks: DecoderBlocks;
}

interface ExtractedData {
  pokedex: UnknownRecord;
  moves: UnknownRecord;
  items: unknown[];
  passiveItems: unknown[];
  usableItems: unknown[];
  typeItemMap: UnknownRecord;
  challenges: UnknownRecord[];
  weeklyChallenges: unknown[];
  nodeTypes: UnknownRecord;
  evolutions: UnknownRecord;
  branchingEvolutions: UnknownRecord;
  legendaryIds: unknown[];
  gen3AbilityLines: unknown[];
  gen3Abilities: UnknownRecord;
  stageGenRanges: UnknownRecord;
  stageMeta: unknown[];
  monotypeTypes: unknown[];
  gen3MapNames: unknown[];
  gen3MapLevelRanges: unknown[];
}

interface BundleCounts {
  pokedex: number;
  moves: number;
  items: number;
  passives: number;
  usableItems: number;
  challenges: number;
  weeklyChallenges: number;
  nodeTypes: number;
  evolutions: number;
  branchingEvolutions: number;
  legendaryIds: number;
  gen3Abilities: number;
}

export interface BundleMeta {
  sourceBundle: string;
  sourcePath: string;
  sha256: string;
  extractedAt: string;
  bundleMtime: string;
  decoder: {
    offset: number;
    rotations: number;
    stringCount: number;
  };
  counts: BundleCounts;
  warnings: string[];
  inputResolution?: BundleResolution;
}

export interface ExtractBundleOptions {
  rootDir?: string;
}

export interface ExtractBundleResult {
  bundlePath: string;
  meta: BundleMeta;
  data: ExtractedData;
}

interface RunCliOptions extends ExtractBundleOptions {
  outDir?: string;
}

function isRecord(value: unknown): value is UnknownRecord {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function asRecord(value: unknown): UnknownRecord {
  return isRecord(value) ? value : {};
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function slash(value: string): string {
  return value.replace(/\\/g, '/');
}

function formatJson(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function parseInteger(value: string | number): number {
  return String(value).startsWith('0x') ? Number.parseInt(value, 16) : Number(value);
}

function sha256(source: string): string {
  return createHash('sha256').update(source).digest('hex');
}

function isHtmlFile(filePath: string): boolean {
  return /\.html?$/i.test(filePath);
}

function isJavaScriptFile(filePath: string): boolean {
  return /\.m?js$/i.test(filePath);
}

function isLocalBundleCandidate(filePath: string, rootDir: string): boolean {
  const rel = slash(path.relative(rootDir, filePath));
  return (
    /^bundle.*\.js$/i.test(rel) ||
    /^pokelike-bundle.*\.js$/i.test(rel) ||
    /^js\/bundle.*\.js$/i.test(rel)
  );
}

function statCandidate(filePath: string, rootDir: string, source: BundleCandidate['source']): BundleCandidate {
  const stat = statSync(filePath);
  return {
    path: filePath,
    rel: slash(path.relative(rootDir, filePath)),
    mtimeMs: stat.mtimeMs,
    size: stat.size,
    source,
  };
}

function listLocalBundleCandidates(rootDir = ROOT_DIR): BundleCandidate[] {
  const candidates: BundleCandidate[] = [];
  for (const dir of [rootDir, path.join(rootDir, 'js')]) {
    if (!existsSync(dir)) continue;
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (!entry.isFile()) continue;
      const filePath = path.join(dir, entry.name);
      if (isLocalBundleCandidate(filePath, rootDir)) {
        candidates.push(statCandidate(filePath, rootDir, 'autodetect'));
      }
    }
  }
  return candidates;
}

function resolvePathMaybeRelative(inputPath: string, rootDir = ROOT_DIR): string {
  if (path.isAbsolute(inputPath)) return path.normalize(inputPath);
  const cwdPath = path.resolve(process.cwd(), inputPath);
  if (existsSync(cwdPath)) return cwdPath;
  return path.resolve(rootDir, inputPath);
}

function parseBundleFromHtml(htmlPath: string, rootDir = ROOT_DIR): string {
  const html = readFileSync(htmlPath, 'utf8');
  const scriptRe = /<script\b[^>]*\bsrc\s*=\s*["']([^"']*bundle[^"']*\.js(?:[?#][^"']*)?)["'][^>]*>/gi;
  const matches = [...html.matchAll(scriptRe)].map((match) => match[1]);
  if (!matches.length) {
    throw new Error(`No bundle script tag was found in ${htmlPath}`);
  }

  const resolved = [];
  for (const src of matches) {
    const cleanSrc = src.replace(/[?#].*$/, '');
    const candidates = [];
    try {
      const url = new URL(cleanSrc);
      candidates.push(path.join(rootDir, path.basename(url.pathname)));
      candidates.push(path.join(rootDir, 'js', path.basename(url.pathname)));
    } catch {
      candidates.push(path.resolve(path.dirname(htmlPath), cleanSrc));
      candidates.push(path.resolve(rootDir, cleanSrc));
      candidates.push(path.join(rootDir, path.basename(cleanSrc)));
      candidates.push(path.join(rootDir, 'js', path.basename(cleanSrc)));
    }

    for (const candidate of candidates) {
      if (existsSync(candidate) && isJavaScriptFile(candidate)) {
        resolved.push(path.normalize(candidate));
      }
    }
  }

  const unique = [...new Set(resolved)];
  if (unique.length === 1) return unique[0];
  if (unique.length > 1) {
    throw new Error(
      `Ambiguous bundle scripts in ${htmlPath}:\n${unique.map((item) => `- ${item}`).join('\n')}`,
    );
  }
  throw new Error(
    `Bundle script tag was found in ${htmlPath}, but the referenced JS file is not available locally.`,
  );
}

export function resolveBundleInput(args: string[] = [], rootDir = ROOT_DIR): ResolvedBundleInput {
  const [input] = args;
  if (input) {
    const explicitPath = resolvePathMaybeRelative(input, rootDir);
    if (!existsSync(explicitPath)) {
      throw new Error(`Bundle input does not exist: ${explicitPath}`);
    }
    if (isHtmlFile(explicitPath)) {
      const bundlePath = parseBundleFromHtml(explicitPath, rootDir);
      return {
        bundlePath,
        resolution: {
          mode: 'html',
          input: explicitPath,
          rel: slash(path.relative(rootDir, bundlePath)),
        },
      };
    }
    if (!isJavaScriptFile(explicitPath)) {
      throw new Error(`Bundle input must be a JS or HTML file: ${explicitPath}`);
    }
    return {
      bundlePath: explicitPath,
      resolution: {
        mode: 'explicit',
        input: explicitPath,
        rel: slash(path.relative(rootDir, explicitPath)),
      },
    };
  }

  const candidates = listLocalBundleCandidates(rootDir).sort(
    (a, b) => b.mtimeMs - a.mtimeMs || b.size - a.size || a.rel.localeCompare(b.rel),
  );
  if (!candidates.length) {
    throw new Error(
      'No local Pokelike bundle was found. Pass one explicitly, for example: npm run extract:bundle -- bundle.xxxxx.js',
    );
  }

  const newest = candidates[0];
  const newestTies = candidates.filter(
    (candidate) => Math.abs(candidate.mtimeMs - newest.mtimeMs) <= NEWEST_TIE_WINDOW_MS,
  );
  if (newestTies.length > 1) {
    throw new Error(
      `Ambiguous newest bundle candidates. Pass one explicitly:\n${newestTies
        .map((candidate) => `- ${candidate.rel}`)
        .join('\n')}`,
    );
  }

  return {
    bundlePath: newest.path,
    resolution: {
      mode: 'autodetect',
      rel: newest.rel,
      candidates: candidates.map((candidate) => candidate.rel),
    },
  };
}

function findMatchingBrace(source: string, openIndex: number): number {
  let depth = 0;
  let quote: string | null = null;
  let escaped = false;
  let lineComment = false;
  let blockComment = false;
  let templateExpressionDepth = 0;

  for (let index = openIndex; index < source.length; index += 1) {
    const char = source[index];
    const next = source[index + 1];

    if (lineComment) {
      if (char === '\n' || char === '\r') lineComment = false;
      continue;
    }
    if (blockComment) {
      if (char === '*' && next === '/') {
        blockComment = false;
        index += 1;
      }
      continue;
    }
    if (quote) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (char === '\\') {
        escaped = true;
        continue;
      }
      if (quote === '`' && char === '$' && next === '{') {
        templateExpressionDepth += 1;
        index += 1;
        continue;
      }
      if (quote === '`' && templateExpressionDepth > 0) {
        if (char === '{') templateExpressionDepth += 1;
        if (char === '}') templateExpressionDepth -= 1;
        continue;
      }
      if (char === quote) quote = null;
      continue;
    }

    if (char === '/' && next === '/') {
      lineComment = true;
      index += 1;
      continue;
    }
    if (char === '/' && next === '*') {
      blockComment = true;
      index += 1;
      continue;
    }
    if (char === '"' || char === "'" || char === '`') {
      quote = char;
      continue;
    }
    if (char === '{') depth += 1;
    if (char === '}') {
      depth -= 1;
      if (depth === 0) return index;
    }
  }

  throw new Error(`Could not find matching brace at index ${openIndex}`);
}

function findFunctionBlock(source: string, name: string): Required<Pick<SourceRange, 'start' | 'end' | 'code'>> {
  const functionRe = new RegExp(`function\\s+${name}\\s*\\(`);
  const match = functionRe.exec(source);
  if (!match) throw new Error(`Could not locate function ${name}() in bundle`);
  const openIndex = source.indexOf('{', match.index);
  const closeIndex = findMatchingBrace(source, openIndex);
  return {
    start: match.index,
    end: closeIndex + 1,
    code: source.slice(match.index, closeIndex + 1),
  };
}

function decodeBundledString(value: string): string {
  const alphabet = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789+/=';
  let output = '';
  let percentEncoded = '';
  const guard = output + decodeBundledString;

  for (
    let block = 0, buffer, charIndex, sourceIndex = 0;
    (charIndex = value.charAt(sourceIndex++));
    ~charIndex &&
    ((buffer = block % 4 ? buffer * 64 + charIndex : charIndex),
    block++ % 4)
      ? (output +=
          guard.charCodeAt(sourceIndex + 10) - 10 !== 0
            ? String.fromCharCode(0xff & (buffer >> ((-2 * block) & 6)))
            : block)
      : 0
  ) {
    charIndex = alphabet.indexOf(charIndex);
  }

  for (let index = 0; index < output.length; index += 1) {
    percentEncoded += `%${(`00${output.charCodeAt(index).toString(16)}`).slice(-2)}`;
  }
  return decodeURIComponent(percentEncoded);
}

function evaluateRawStringArray(xBlock: DecoderBlocks['xBlock']): string[] {
  const sandbox = {} as { __rawStrings?: unknown };
  const source = `${xBlock.code}\n__rawStrings = x();`;
  vm.runInNewContext(source, sandbox, { timeout: EXTRACTION_TIMEOUT_MS });
  if (!Array.isArray(sandbox.__rawStrings) || !sandbox.__rawStrings.length) {
    throw new Error('The bundle string table was not extracted from function x().');
  }
  return sandbox.__rawStrings;
}

function parseDecoderOffset(cBlock: DecoderBlocks['cBlock']): number {
  const match = cBlock.code.match(/=\s*[A-Za-z_$][\w$]*\s*-\s*(0x[0-9a-fA-F]+|\d+)/);
  return match ? parseInteger(match[1]) : DECODER_OFFSET_FALLBACK;
}

function findRotationLoop(source: string): RotationLoop {
  const rotationRe =
    /\(function\s*\(\s*([A-Za-z_$][\w$]*)\s*,\s*([A-Za-z_$][\w$]*)\s*\)\s*\{[\s\S]*?\}\s*\(\s*x\s*,\s*(0x[0-9a-fA-F]+|\d+)\s*\)\s*\);/;
  const match = rotationRe.exec(source);
  if (!match) throw new Error('Could not locate the bundle string rotation loop.');

  const body = match[0];
  const aliasMatch = body.match(/const\s+([A-Za-z_$][\w$]*)\s*=\s*C\b/);
  const expressionMatch = body.match(/const\s+[A-Za-z_$][\w$]*\s*=\s*([^;]+);\s*if\s*\(/s);
  if (!aliasMatch || !expressionMatch) {
    throw new Error('Could not parse the bundle string rotation expression.');
  }

  return {
    start: match.index,
    end: match.index + match[0].length,
    alias: aliasMatch[1],
    expression: expressionMatch[1],
    target: parseInteger(match[3]),
  };
}

function rotateStringTable(
  rawStrings: string[],
  rotation: RotationLoop,
  offset: number,
): Pick<DecodedBundleStrings, 'strings' | 'rotations'> {
  const strings = rawStrings.slice();
  const calculate = new Function(rotation.alias, `return ${rotation.expression};`);
  let rotations = 0;

  while (rotations < strings.length + 10_000) {
    const decodeAt = (index: number | string) => decodeBundledString(strings[Number(index) - offset]);
    let value;
    try {
      value = calculate(decodeAt);
    } catch {
      value = Number.NaN;
    }
    if (value === rotation.target) {
      return {
        strings: strings.map((value) => decodeBundledString(value)),
        rotations,
      };
    }
    strings.push(strings.shift());
    rotations += 1;
  }

  throw new Error('The bundle string table rotation did not converge.');
}

function replaceRanges(source: string, ranges: SourceRange[]): string {
  return [...ranges]
    .sort((a, b) => b.start - a.start)
    .reduce(
      (current, range) => `${current.slice(0, range.start)}${range.replacement ?? ''}${current.slice(range.end)}`,
      source,
    );
}

function safeJsonForJavaScript(value: unknown): string {
  return JSON.stringify(value).replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
}

export function buildTransformedBundle(
  source: string,
  decodedStrings: string[],
  offset: number,
  blocks: DecoderBlocks,
): string {
  return replaceRanges(source, [
    {
      start: blocks.rotation.start,
      end: blocks.rotation.end,
      replacement: `const __PKL_STRINGS__ = ${safeJsonForJavaScript(decodedStrings)};`,
    },
    {
      start: blocks.cBlock.start,
      end: blocks.cBlock.end,
      replacement: `function C(Z) { return __PKL_STRINGS__[Number(Z) - ${offset}]; }`,
    },
    {
      start: blocks.xBlock.start,
      end: blocks.xBlock.end,
      replacement: 'function x() { return __PKL_STRINGS__; }',
    },
  ]);
}

export function stripFunctionIifes(source: string): string {
  const ranges: SourceRange[] = [];
  let index = 0;

  while (index < source.length) {
    const start = source.indexOf('(function', index);
    if (start === -1) break;

    const functionIndex = source.indexOf('function', start);
    if (functionIndex === -1 || source.slice(start + 1, functionIndex).trim() !== '') {
      index = start + 1;
      continue;
    }

    const openBrace = source.indexOf('{', functionIndex);
    if (openBrace === -1) {
      index = start + 1;
      continue;
    }

    let closeBrace: number;
    try {
      closeBrace = findMatchingBrace(source, openBrace);
    } catch {
      index = start + 1;
      continue;
    }

    const tail = source.slice(closeBrace + 1, closeBrace + 250);
    const callMatch = tail.match(/^\s*\([^(){};]*\)\s*\)?\s*;?/);
    if (!callMatch) {
      index = closeBrace + 1;
      continue;
    }

    ranges.push({
      start,
      end: closeBrace + 1 + callMatch[0].length,
      replacement: 'void 0',
    });
    index = closeBrace + 1 + callMatch[0].length;
  }

  return replaceRanges(source, ranges);
}

export function decodeBundleStringTable(source: string): DecodedBundleStrings {
  const xBlock = findFunctionBlock(source, 'x');
  const cBlock = findFunctionBlock(source, 'C');
  const rotation = findRotationLoop(source);
  const offset = parseDecoderOffset(cBlock);
  const rawStrings = evaluateRawStringArray(xBlock);
  const rotated = rotateStringTable(rawStrings, rotation, offset);

  return {
    strings: rotated.strings,
    offset,
    rotations: rotated.rotations,
    blocks: { xBlock, cBlock, rotation },
  };
}

interface ClassListStub {
  add(): void;
  remove(): void;
  toggle(): boolean;
  contains(): boolean;
}

function createClassListStub(): ClassListStub {
  return {
    add() {},
    remove() {},
    toggle() {
      return false;
    },
    contains() {
      return false;
    },
  };
}

function createElementStub(): any {
  const classList = createClassListStub();
  const style: UnknownRecord = {};
  let element: any;
  const target = function elementStub() {};
  element = new Proxy(target, {
    get(_target, property) {
      if (property === Symbol.iterator) return function* iterator() {};
      if (property === 'classList') return classList;
      if (property === 'style') return style;
      if (property === 'children' || property === 'childNodes') return [];
      if (property === 'length') return 0;
      if (property === 'matches') return () => false;
      if (property === 'closest') return () => null;
      if (property === 'querySelector') return () => element;
      if (property === 'querySelectorAll') return () => [];
      if (property === 'getBoundingClientRect') {
        return () => ({ left: 0, top: 0, right: 0, bottom: 0, width: 0, height: 0 });
      }
      if (
        property === 'addEventListener' ||
        property === 'removeEventListener' ||
        property === 'appendChild' ||
        property === 'append' ||
        property === 'prepend' ||
        property === 'remove' ||
        property === 'setAttribute' ||
        property === 'removeAttribute' ||
        property === 'insertAdjacentHTML' ||
        property === 'requestFullscreen'
      ) {
        return () => {};
      }
      if (property === 'getContext') return () => ({});
      if (property === 'dataset') return {};
      if (property === 'value') return '';
      if (property === 'textContent' || property === 'innerHTML') return '';
      return element;
    },
    set() {
      return true;
    },
    apply() {
      return element;
    },
  });
  return element;
}

function createVmSandbox(): UnknownRecord {
  const noop = () => {};
  const element = createElementStub();
  const storage = {
    getItem: () => null,
    setItem: noop,
    removeItem: noop,
    clear: noop,
    key: () => null,
    length: 0,
  };
  const document = {
    readyState: 'loading',
    hidden: false,
    cookie: '',
    documentElement: element,
    body: element,
    head: element,
    addEventListener: noop,
    removeEventListener: noop,
    querySelector: () => element,
    querySelectorAll: () => [],
    getElementById: () => element,
    getElementsByClassName: () => [],
    getElementsByTagName: () => [],
    createElement: () => createElementStub(),
    createElementNS: () => createElementStub(),
    elementFromPoint: () => element,
  };
  const location = {
    hostname: 'pokelike.xyz',
    href: 'https://pokelike.xyz/',
    origin: 'https://pokelike.xyz',
    protocol: 'https:',
    pathname: '/',
    search: '',
    hash: '',
  };
  const window: any = {
    document,
    location,
    localStorage: storage,
    sessionStorage: storage,
    navigator: { userAgent: 'easy-pokelike-extractor', clipboard: { writeText: noop } },
    innerWidth: 1280,
    innerHeight: 720,
    devicePixelRatio: 1,
    addEventListener: noop,
    removeEventListener: noop,
    dispatchEvent: () => true,
    matchMedia: () => ({ matches: false, addEventListener: noop, removeEventListener: noop }),
    getComputedStyle: () => ({ getPropertyValue: () => '' }),
    open: noop,
    alert: noop,
    confirm: () => false,
  };
  window.window = window;
  window.self = window;
  window.globalThis = window;

  // The extractor only needs declarations to run. DOM APIs intentionally
  // return inert stubs so the game UI cannot start doing real browser work.
  const sandbox: any = {
    window,
    self: window,
    document,
    location,
    localStorage: storage,
    sessionStorage: storage,
    navigator: window.navigator,
    console: { log: noop, warn: noop, error: noop, info: noop, debug: noop },
    setTimeout: noop,
    clearTimeout: noop,
    setInterval: noop,
    clearInterval: noop,
    requestAnimationFrame: noop,
    cancelAnimationFrame: noop,
    fetch: () => Promise.reject(new Error('fetch disabled during extraction')),
    alert: noop,
    confirm: () => false,
    getComputedStyle: window.getComputedStyle,
    Image: function Image() {
      return createElementStub();
    },
    Event: function Event() {},
    CustomEvent: function CustomEvent() {},
    MouseEvent: function MouseEvent() {},
    KeyboardEvent: function KeyboardEvent() {},
    PointerEvent: function PointerEvent() {},
    ResizeObserver: function ResizeObserver() {
      return { observe: noop, unobserve: noop, disconnect: noop };
    },
    MutationObserver: function MutationObserver() {
      return { observe: noop, disconnect: noop };
    },
    crypto: { randomUUID: () => '00000000-0000-4000-8000-000000000000' },
    atob: (value) => Buffer.from(value, 'base64').toString('binary'),
    btoa: (value) => Buffer.from(value, 'binary').toString('base64'),
    URL,
    URLSearchParams,
  };
  sandbox.globalThis = sandbox;
  return sandbox;
}

function buildExtractionProgram(transformedBundle: string): string {
  const inertBundle = stripFunctionIifes(transformedBundle);
  const stopIndex = inertBundle.indexOf('const WEEKLY_CHALLENGES');
  if (stopIndex === -1) {
    throw new Error('Could not locate WEEKLY_CHALLENGES in the transformed bundle.');
  }
  const statementEnd = inertBundle.indexOf(';', stopIndex);
  if (statementEnd === -1) {
    throw new Error('Could not find the end of the WEEKLY_CHALLENGES declaration.');
  }

  return `${inertBundle.slice(0, statementEnd + 1)}
globalThis.__PKL_EXTRACTED__ = {
  pokedex: typeof wE !== 'undefined' ? wE : {},
  moves: typeof MOVE_POOL !== 'undefined' ? MOVE_POOL : {},
  items: typeof ITEM_POOL !== 'undefined' ? ITEM_POOL : [],
  passiveItems: typeof PASSIVE_ITEM_POOL !== 'undefined' ? PASSIVE_ITEM_POOL : [],
  usableItems: typeof USABLE_ITEM_POOL !== 'undefined' ? USABLE_ITEM_POOL : [],
  typeItemMap: typeof DD !== 'undefined' ? DD : {},
  challenges: typeof CHALLENGES !== 'undefined' ? CHALLENGES : [],
  weeklyChallenges: typeof WEEKLY_CHALLENGES !== 'undefined' ? WEEKLY_CHALLENGES : [],
  nodeTypes: typeof NODE_TYPES !== 'undefined' ? NODE_TYPES : {},
  evolutions: typeof EVOLUTIONS !== 'undefined' ? EVOLUTIONS : {},
  branchingEvolutions: typeof BRANCHING_EVOLUTIONS !== 'undefined' ? BRANCHING_EVOLUTIONS : {},
  legendaryIds: typeof LEGENDARY_IDS !== 'undefined' ? LEGENDARY_IDS : [],
  gen3AbilityLines: typeof GEN3_ABILITY_LINES !== 'undefined' ? GEN3_ABILITY_LINES : [],
  gen3Abilities: typeof GEN3_ABILITY_BY_SPECIES !== 'undefined' ? GEN3_ABILITY_BY_SPECIES : {},
  stageGenRanges: typeof STAGE_GEN_RANGES !== 'undefined' ? STAGE_GEN_RANGES : {},
  stageMeta: typeof STAGE_META !== 'undefined' ? STAGE_META : [],
  monotypeTypes: typeof MONOTYPE_TYPES !== 'undefined' ? MONOTYPE_TYPES : [],
  gen3MapNames: typeof GEN3_MAP_NAMES !== 'undefined' ? GEN3_MAP_NAMES : [],
  gen3MapLevelRanges: typeof GEN3_MAP_LEVEL_RANGES !== 'undefined' ? GEN3_MAP_LEVEL_RANGES : [],
};`;
}

function cloneForJson(value: unknown, seen = new WeakSet<object>()): unknown {
  if (value === null) return null;
  if (typeof value === 'undefined' || typeof value === 'function') return undefined;
  if (typeof value !== 'object') return value;
  if (seen.has(value)) return undefined;
  seen.add(value);

  const tag = Object.prototype.toString.call(value);
  if (tag === '[object Set]') {
    return Array.from(value as Set<unknown>, (item) => cloneForJson(item, seen));
  }
  if (tag === '[object Map]') {
    return Object.fromEntries(
      Array.from(value as Map<string, unknown>, ([key, item]) => [key, cloneForJson(item, seen)]),
    );
  }
  if (Array.isArray(value)) {
    return value.map((item) => cloneForJson(item, seen));
  }

  const output: UnknownRecord = {};
  for (const [key, item] of Object.entries(value)) {
    const cloned = cloneForJson(item, seen);
    if (typeof cloned !== 'undefined') output[key] = cloned;
  }
  return output;
}

function normalizeExtractedData(rawData: unknown): ExtractedData {
  const data = asRecord(cloneForJson(rawData));
  return {
    pokedex: asRecord(data.pokedex),
    moves: asRecord(data.moves),
    items: asArray(data.items),
    passiveItems: asArray(data.passiveItems),
    usableItems: asArray(data.usableItems),
    typeItemMap: asRecord(data.typeItemMap),
    challenges: asArray(data.challenges).filter(isRecord),
    weeklyChallenges: asArray(data.weeklyChallenges),
    nodeTypes: asRecord(data.nodeTypes),
    evolutions: asRecord(data.evolutions),
    branchingEvolutions: asRecord(data.branchingEvolutions),
    legendaryIds: asArray(data.legendaryIds),
    gen3AbilityLines: asArray(data.gen3AbilityLines),
    gen3Abilities: asRecord(data.gen3Abilities),
    stageGenRanges: asRecord(data.stageGenRanges),
    stageMeta: asArray(data.stageMeta),
    monotypeTypes: asArray(data.monotypeTypes),
    gen3MapNames: asArray(data.gen3MapNames),
    gen3MapLevelRanges: asArray(data.gen3MapLevelRanges),
  };
}

function countObject(value: unknown): number {
  return value && typeof value === 'object' ? Object.keys(value).length : 0;
}

function countArray(value: unknown): number {
  return Array.isArray(value) ? value.length : 0;
}

function buildCounts(data: ExtractedData): BundleCounts {
  return {
    pokedex: countObject(data.pokedex),
    moves: countObject(data.moves),
    items: countArray(data.items),
    passives: countArray(data.passiveItems),
    usableItems: countArray(data.usableItems),
    challenges: countArray(data.challenges),
    weeklyChallenges: countArray(data.weeklyChallenges),
    nodeTypes: countObject(data.nodeTypes),
    evolutions: countObject(data.evolutions),
    branchingEvolutions: countObject(data.branchingEvolutions),
    legendaryIds: countArray(data.legendaryIds),
    gen3Abilities: countObject(data.gen3Abilities),
  };
}

function buildWarnings(counts: BundleCounts): string[] {
  const expectedPositive = {
    pokedex: counts.pokedex,
    moves: counts.moves,
    items: counts.items,
    passives: counts.passives,
    challenges: counts.challenges,
    weeklyChallenges: counts.weeklyChallenges,
    nodeTypes: counts.nodeTypes,
    evolutions: counts.evolutions,
    gen3Abilities: counts.gen3Abilities,
  };
  return Object.entries(expectedPositive)
    .filter(([, count]) => count <= 0)
    .map(([name]) => `Missing or empty section: ${name}`);
}

export function extractBundle(bundlePath: string, options: ExtractBundleOptions = {}): ExtractBundleResult {
  const rootDir = options.rootDir || ROOT_DIR;
  const source = readFileSync(bundlePath, 'utf8').replace(/^\uFEFF/, '');
  const decoded = decodeBundleStringTable(source);
  const transformed = buildTransformedBundle(source, decoded.strings, decoded.offset, decoded.blocks);
  const program = buildExtractionProgram(transformed);
  const sandbox = createVmSandbox();

  vm.runInNewContext(program, sandbox, { timeout: EXTRACTION_TIMEOUT_MS });
  if (!sandbox.__PKL_EXTRACTED__) {
    throw new Error('The transformed bundle did not expose extracted data.');
  }

  const data = normalizeExtractedData(sandbox.__PKL_EXTRACTED__);
  const counts = buildCounts(data);
  const warnings = buildWarnings(counts);
  const bundleStat = statSync(bundlePath);
  const meta: BundleMeta = {
    sourceBundle: path.basename(bundlePath),
    sourcePath: slash(path.relative(rootDir, bundlePath)),
    sha256: sha256(source),
    extractedAt: new Date().toISOString(),
    bundleMtime: bundleStat.mtime.toISOString(),
    decoder: {
      offset: decoded.offset,
      rotations: decoded.rotations,
      stringCount: decoded.strings.length,
    },
    counts,
    warnings,
  };

  return {
    bundlePath,
    meta,
    data,
  };
}

export async function writeGeneratedData(result: ExtractBundleResult, outDir = GENERATED_DIR): Promise<void> {
  await mkdir(outDir, { recursive: true });
  const writes = Object.entries(OUTPUT_FILES).map(([key, fileName]) =>
    writeFile(path.join(outDir, fileName), formatJson(result.data[key as keyof ExtractedData]), 'utf8'),
  );
  writes.push(writeFile(path.join(outDir, 'bundle-meta.json'), formatJson(result.meta), 'utf8'));
  await Promise.all(writes);
}

export async function runCli(
  args: string[] = process.argv.slice(2),
  options: RunCliOptions = {},
): Promise<ExtractBundleResult> {
  const rootDir = options.rootDir || ROOT_DIR;
  const outDir = options.outDir || GENERATED_DIR;
  const { bundlePath, resolution } = resolveBundleInput(args, rootDir);
  const result = extractBundle(bundlePath, { rootDir });
  result.meta.inputResolution = resolution;
  await writeGeneratedData(result, outDir);

  const relOut = slash(path.relative(rootDir, outDir));
  console.log(`Extracted ${result.meta.sourcePath} -> ${relOut}`);
  console.log(
    `Counts: pokedex=${result.meta.counts.pokedex}, moves=${result.meta.counts.moves}, items=${result.meta.counts.items}, passives=${result.meta.counts.passives}, challenges=${result.meta.counts.challenges}, nodeTypes=${result.meta.counts.nodeTypes}`,
  );
  if (result.meta.warnings.length) {
    console.warn(`Warnings:\n${result.meta.warnings.map((warning) => `- ${warning}`).join('\n')}`);
  }
  return result;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  runCli().catch((error: Error) => {
    console.error(error.stack || error.message);
    process.exitCode = 1;
  });
}
