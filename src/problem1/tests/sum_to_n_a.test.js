// sum_to_n_a.test.js
const { sum_to_n_a } = require('../sum_to_n_a.js');

const cases = [
  { n: 5, expected: 15, desc: 'Tổng 1..5' },
  { n: 1, expected: 1, desc: 'Biên: n = 1' },
  { n: 0, expected: 0, desc: 'Biên: n = 0 (rỗng)' },
];

function run() {
  const line = '─'.repeat(48);
  console.log(`\n${line}`);
  console.log('  sum_to_n_a — kiểm tra');
  console.log(line);

  let failed = 0;

  for (let i = 0; i < cases.length; i++) {
    const { n, expected, desc } = cases[i];
    const actual = sum_to_n_a(n);
    const ok = actual === expected;
    const idx = i + 1;

    if (!ok) failed++;

    console.log(`  Case ${idx}/${cases.length}: ${desc}`);
    console.log(`    sum_to_n_a(${n})  →  nhận được: ${actual}  |  mong đợi: ${expected}`);
    console.log(`    ${ok ? '✓ Đạt' : '✗ Sai'}\n`);
  }

  console.log(line);
  if (failed > 0) {
    console.log(`  Kết quả: THẤT BẠI — ${failed}/${cases.length} case.\n`);
    process.exit(1);
  }
  console.log(`  Kết quả: ĐẠT — ${cases.length}/${cases.length} case.\n`);
}

run();
