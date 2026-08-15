const path = require('path');

async function run() {
  const { loadParserEngine, RAW_FIXTURE_TEXT } = require('../../test-parser.js');
  const engine = await loadParserEngine();
  const res = await engine.parse(RAW_FIXTURE_TEXT);
  console.log('Result length:', res.length);
  res.forEach((q, i) => {
    console.log(`\n=== Question ${i + 1} ===`);
    console.log('Content:', q.content);
    console.log('Options:', q.options);
    console.log('Ans Index:', q.correct_option_index);
    console.log('Ans:', q.correct_answer);
    console.log('Explanation:', q.explanation);
    console.log('Subject:', q.subject);
  });
}

run().catch(console.error);
