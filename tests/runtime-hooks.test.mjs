import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import vm from 'node:vm';

import { Window } from 'happy-dom';

import { ROOT_DIR } from '../scripts/build-userscript.ts';

function runRuntimeHooks(window, logger) {
  const source = readFileSync(
    path.join(ROOT_DIR, 'src', 'core', 'parts', '00-runtime-hooks.js'),
    'utf8',
  );
  const context = {
    Element: window.Element,
    console: logger,
  };
  context.globalThis = context;
  vm.runInNewContext(`(function() {\n${source}\n})();`, context);
}

test('runtime pointer-capture guard is idempotent and swallows NotFoundError', () => {
  const window = new Window();
  const warnings = [];
  const logger = {
    warn: (...args) => warnings.push(args),
  };
  const originalSetPointerCapture = () => {
    const error = new Error('missing pointer');
    error.name = 'NotFoundError';
    throw error;
  };
  const originalReleasePointerCapture = () => {
    const error = new Error('missing pointer');
    error.name = 'NotFoundError';
    throw error;
  };

  window.Element.prototype.setPointerCapture = originalSetPointerCapture;
  window.Element.prototype.releasePointerCapture = originalReleasePointerCapture;

  runRuntimeHooks(window, logger);
  const firstPatchedSetPointerCapture = window.Element.prototype.setPointerCapture;
  runRuntimeHooks(window, logger);

  assert.equal(window.Element.prototype.setPointerCapture, firstPatchedSetPointerCapture);
  assert.doesNotThrow(() => window.document.createElement('button').setPointerCapture(7));
  assert.doesNotThrow(() => window.document.createElement('button').releasePointerCapture(7));
  assert.equal(warnings.length, 2);
  assert.equal(
    window.Element.prototype.__easyPokelikePointerCaptureGuard.originalSetPointerCapture,
    originalSetPointerCapture,
  );
});

test('runtime pointer-capture guard rethrows unexpected errors', () => {
  const window = new Window();
  const logger = {
    warn: () => undefined,
  };
  window.Element.prototype.setPointerCapture = () => {
    throw new TypeError('unexpected');
  };

  runRuntimeHooks(window, logger);

  assert.throws(() => window.document.createElement('button').setPointerCapture(1), /unexpected/);
});
