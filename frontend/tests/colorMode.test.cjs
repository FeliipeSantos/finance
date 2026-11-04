const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

function loadTypeScript(filename) {
  const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const module = { exports: {} };
  new Function('require', 'module', 'exports', code)(require, module, module.exports);
  return module.exports;
}
const { readColorMode, COLOR_MODE_KEY } = loadTypeScript(path.resolve(__dirname, '../src/theme/colorMode.ts'));
const { createAppTheme } = loadTypeScript(path.resolve(__dirname, '../src/theme/theme.ts'));
const { getContrastRatio } = require('@mui/material/styles');

test('restores saved preferences and falls back safely for missing, invalid or blocked storage', () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  try {
    for (const [stored, expected] of [[null, 'dark'], ['light', 'light'], ['dark', 'dark'], ['invalid', 'dark']]) {
      Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
        getItem(key) { assert.equal(key, COLOR_MODE_KEY); return stored; },
      } });
      assert.equal(readColorMode(), expected);
    }
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, get() { throw new Error('Storage blocked'); } });
    assert.equal(readColorMode(), 'dark');
  } finally {
    if (original) Object.defineProperty(globalThis, 'localStorage', original);
    else delete globalThis.localStorage;
  }
});

test('both themes keep primary and secondary text readable on page and paper surfaces', () => {
  for (const mode of ['dark', 'light']) {
    const { palette } = createAppTheme(mode);
    for (const surface of [palette.background.default, palette.background.paper]) {
      assert.ok(getContrastRatio(palette.text.primary, surface) >= 4.5, `${mode} primary text`);
      assert.ok(getContrastRatio(palette.text.secondary, surface) >= 4.5, `${mode} secondary text`);
    }
  }
});
