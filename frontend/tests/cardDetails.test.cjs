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
const { invoiceItems, invoicePaid, totalValue, categoryRanking, dailyStatement } = loadTypeScript(path.resolve(__dirname, '../src/modules/cards/cardDetails.ts'));
const { nextMonth, prevMonth } = loadTypeScript(path.resolve(__dirname, '../src/utils/cardInvoice.ts'));
const tx = (overrides = {}) => ({ id: '1', description: 'Compra', date: '2026-08-30', dueDate: '2026-09-08', value: 50, effective: false, ...overrides });

test('fatura segue o mês contabilizado e não mistura os meses', () => {
  const pending = tx();
  const paid = tx({ id: '2', effective: true, effectiveDate: '2026-10-01' });
  assert.deepEqual(invoiceItems([pending, paid], 9, 2026), [pending]);
  assert.deepEqual(invoiceItems([pending, paid], 10, 2026), [paid]);
});
test('pagamento exige todos os lançamentos, inclusive em fatura parcial', () => {
  assert.equal(invoicePaid([]), false);
  assert.equal(invoicePaid([tx()]), false);
  assert.equal(invoicePaid([tx({ effective: true }), tx()]), false);
  assert.equal(invoicePaid([tx({ effective: true })]), true);
});
test('ranking reúne subcategorias e não considera estornos como despesas', () => {
  const categories = [{ id: 'home', name: 'Moradia' }, { id: 'rent', name: 'Aluguel', parentCategoryId: 'home' }];
  const ranking = categoryRanking([tx({ categoryId: 'rent', value: 90 }), tx({ categoryId: 'home', value: 10 }), tx({ categoryId: 'home', value: -20 }), tx({ value: 100 })], categories);
  assert.equal(ranking[0].category.id, 'home');
  assert.equal(ranking[0].total, 100);
  assert.equal(ranking[0].percentage, 50);
  assert.equal(ranking[1].category.name, 'Sem categoria');
});
test('extrato agrupa por dia da compra com saldo acumulado e estornos', () => {
  const transactions = [tx({ date: '2026-08-29', value: 100 }), tx({ date: '2026-08-31', value: 50 }), tx({ date: '2026-08-31', value: -10 })];
  const days = dailyStatement(transactions);
  assert.equal(days[0].date, '2026-08-31');
  assert.equal(days[0].items.length, 2);
  assert.equal(days[0].subtotal, 40);
  assert.equal(days[0].balance, 140);
  assert.equal(days[1].balance, 100);
  assert.equal(totalValue([tx({ value: 0.1 }), tx({ value: 0.2 })]), 0.3);
});
test('navegação de faturas atravessa a virada do ano', () => {
  assert.deepEqual(nextMonth(12, 2026), { month: 1, year: 2027 });
  assert.deepEqual(prevMonth(1, 2027), { month: 12, year: 2026 });
});
