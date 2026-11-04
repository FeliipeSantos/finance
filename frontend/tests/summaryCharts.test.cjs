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
  const localRequire = (specifier) => specifier.startsWith('.')
    ? loadTypeScript(path.resolve(path.dirname(filename), `${specifier}.ts`)) : require(specifier);
  new Function('require', 'module', 'exports', code)(localRequire, module, module.exports);
  return module.exports;
}
const { buildSummaryCharts } = loadTypeScript(path.resolve(__dirname, '../src/modules/resume/summaryCharts.ts'));
const tx = (overrides = {}) => ({ type: 'EXPENSE', value: 100, date: '2027-01-10', effective: false, categoryId: 'food', ...overrides });

test('six months cross the year boundary and respect effective dates, due dates and transfers', () => {
  const { monthly } = buildSummaryCharts([
    tx({ date: '2026-07-31', value: 999 }),
    tx({ date: '2026-08-01', value: 80 }),
    tx({ date: '2026-12-10', dueDate: '2027-01-10', value: 120 }),
    tx({ effective: true, effectiveDate: '2026-12-31', value: 30 }),
    tx({ type: 'REVENUE', value: 1000 }),
    tx({ value: -20 }),
    tx({ type: 'TRANSFER', value: 500 }),
    tx({ date: '2027-02-01', value: 999 }),
  ], [], 1, 2027);
  assert.equal(monthly.length, 6);
  assert.equal(monthly[0].month, 8);
  assert.equal(monthly[0].year, 2026);
  assert.equal(monthly[0].Despesas, 80);
  assert.equal(monthly[4].Despesas, 30);
  assert.equal(monthly[5].Despesas, 100);
  assert.equal(monthly[5].Receitas, 1000);
});

test('ranking groups subcategories, nets refunds, includes uncategorized expenses and sorts percentages', () => {
  const categories = [
    { id: 'food', name: 'Alimentação', icon: 'Restaurant', color: '#fff' },
    { id: 'groceries', name: 'Mercado', parentCategoryId: 'food' },
    { id: 'transport', name: 'Transporte' },
  ];
  const { ranking } = buildSummaryCharts([
    tx({ categoryId: 'groceries', value: 200 }), tx({ value: -50 }),
    tx({ categoryId: 'transport', value: 100 }), tx({ categoryId: 'missing', value: 50 }),
    tx({ date: '2026-12-01', value: 999 }), tx({ type: 'REVENUE', value: 999 }),
  ], categories, 1, 2027);
  assert.deepEqual(ranking.map(({ name, value }) => ({ name, value })), [
    { name: 'Alimentação', value: 150 }, { name: 'Transporte', value: 100 }, { name: 'Sem categoria', value: 50 },
  ]);
  assert.equal(ranking[0].percent, 50);
  assert.equal(ranking[0].icon, 'Restaurant');
  assert.ok(Math.abs(ranking.reduce((sum, row) => sum + row.percent, 0) - 100) < 0.001);
});

test('empty periods have zero chart values and no invented ranking data', () => {
  const { monthly, ranking } = buildSummaryCharts([], [], 9, 2026);
  assert.ok(monthly.every((row) => row.Receitas === 0 && row.Despesas === 0));
  assert.deepEqual(ranking, []);
});
