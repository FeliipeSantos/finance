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
const { accountMonthSummary } = loadTypeScript(path.resolve(__dirname, '../src/modules/accounts/accountMonthSummary.ts'));
const account = { id: 'a', balanceInitial: 1000 };
const tx = (overrides = {}) => ({ accountId: 'a', date: '2026-09-01', type: 'REVENUE', value: 200, effective: true, ...overrides });

test('monthly totals include only the selected period and carry the settled opening balance', () => {
  const transactions = [
    tx({ date: '2026-08-01', value: 500 }), tx(),
    tx({ effective: false, value: 300 }), tx({ type: 'EXPENSE', value: 100 }),
    tx({ type: 'EXPENSE', value: 50, accountId: 'wrong', creditCardId: 'card' }),
    tx({ type: 'EXPENSE', value: 80, effective: false, dueDate: '2026-10-10', creditCardId: 'card' }),
    tx({ type: 'TRANSFER', destinationAccountId: 'b', value: 200 }),
    tx({ date: '2026-10-10', value: 999 }),
  ];
  const cards = [{ id: 'card', accountId: 'a' }];
  assert.deepEqual(accountMonthSummary(account, transactions, cards, 9, 2026), {
    opening: 1500, balance: 1350, forecast: 1650, revenues: 500, expenses: 150, transfersIn: 0, transfersOut: 200,
  });
  assert.deepEqual(accountMonthSummary(account, transactions, cards, 10, 2026), {
    opening: 1350, balance: 2349, forecast: 2569, revenues: 999, expenses: 80, transfersIn: 0, transfersOut: 0,
  });
});

test('effective dates, incoming transfers, refunds and year boundaries are respected', () => {
  const transactions = [
    tx({ date: '2026-12-01', dueDate: '2027-01-10', effectiveDate: '2027-01-12' }),
    tx({ date: '2027-01-01', type: 'TRANSFER', accountId: 'b', destinationAccountId: 'a', value: 50 }),
    tx({ date: '2027-01-01', type: 'EXPENSE', value: -25 }),
  ];
  assert.equal(accountMonthSummary(account, transactions, [], 12, 2026).balance, 1000);
  const january = accountMonthSummary(account, transactions, [], 1, 2027);
  assert.equal(january.balance, 1275);
  assert.equal(january.transfersIn, 50);
  assert.equal(january.expenses, -25);
});
