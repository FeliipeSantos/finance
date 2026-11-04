const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const source = fs.readFileSync(path.resolve(__dirname, '../src/utils/transactionDescription.ts'), 'utf8');
const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const loaded = { exports: {} };
new Function('exports', code)(loaded.exports);
const { editableTransactionDescription, restoreTransactionDescription, transactionDescription } = loaded.exports;

test('edição esconde parcela e preserva o índice original ao renomear', () => {
  assert.equal(editableTransactionDescription('Compra parcelada 1/3'), 'Compra parcelada');
  assert.equal(restoreTransactionDescription('Nome atualizado', 'Compra parcelada 1/3'), 'Nome atualizado 1/3');
  assert.equal(restoreTransactionDescription('Nome atualizado 9/99', 'Compra parcelada 1/3'), 'Nome atualizado 1/3');
  assert.equal(transactionDescription('Compra parcelada 1/3'), 'Compra parcelada 1/3');
});

test('edição preserva recorrência fixa sem exibir o marcador no campo', () => {
  for (const marker of ['[Fixa]', '[Fixo]']) {
    assert.equal(editableTransactionDescription(`Aluguel ${marker}`), 'Aluguel');
    assert.equal(restoreTransactionDescription('Aluguel atualizado', `Aluguel ${marker}`), `Aluguel atualizado ${marker}`);
  }
});

test('edição normal não altera números que fazem parte da descrição', () => {
  assert.equal(editableTransactionDescription('Serviço 2026'), 'Serviço 2026');
  assert.equal(restoreTransactionDescription('Serviço 2027', 'Serviço 2026'), 'Serviço 2027');
});
