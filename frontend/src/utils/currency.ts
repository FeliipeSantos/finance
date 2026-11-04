// Soma repetida de valores monetários em `number` (double) pode acumular erro
// de ponto flutuante (ex.: 0.1 + 0.2 === 0.30000000000000004). O backend já
// trabalha com Decimal; isso arredonda o resultado de agregações no frontend
// (somas de totais exibidos) de volta para centavos antes de formatar/exibir.
export function roundCurrency(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
