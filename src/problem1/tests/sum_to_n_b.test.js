// sum_to_n_b.test.js
const { sum_to_n_b } = require('../sum_to_n_b.js');

const cases = [
  { n: 5, expected: 15, desc: 'Sum 1..5' },
  { n: 1, expected: 1, desc: 'Edge: n = 1' },
  { n: 0, expected: 0, desc: 'Edge: n = 0 (empty)' },
];

function run() {
  const line = '─'.repeat(48);
  console.log(`\n${line}`);
  console.log('  sum_to_n_b — tests');
  console.log(line);

  let failed = 0;

  for (let i = 0; i < cases.length; i++) {
    const { n, expected, desc } = cases[i];
    const actual = sum_to_n_b(n);
    const ok = actual === expected;
    const idx = i + 1;

    if (!ok) failed++;

    console.log(`  Case ${idx}/${cases.length}: ${desc}`);
    console.log(`    sum_to_n_b(${n})  →  got: ${actual}  |  expected: ${expected}`);
    console.log(`    ${ok ? '✓ Pass' : '✗ Fail'}\n`);
  }

  console.log(line);
  if (failed > 0) {
    console.log(`  Result: FAILED — ${failed}/${cases.length} case(s).\n`);
    process.exit(1);
  }
  console.log(`  Result: PASSED — ${cases.length}/${cases.length} case(s).\n`);
}

run();
