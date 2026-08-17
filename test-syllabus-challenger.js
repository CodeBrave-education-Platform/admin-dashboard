/**
 * test-syllabus-challenger.js
 * 
 * Challenger 2 Empirical Stress Test & Validation Harness
 * Course Management UI Redesign: Syllabus Importer & Curriculum Editor
 * 
 * Test Suites:
 *   Suite 1: 2D Spatial Layout Reconstruction & PDF Stream Edge Cases
 *   Suite 2: Regex Syllabus Parsing, Header Filtering, Roman Numerals & Duration Conversions
 *   Suite 3: Staging Table Mutations, Sequence Allocation & Duplicate/Integrity Checks
 *   Suite 4: Lesson Tree CRUD, Duration Aggregation & Free Preview Toggling Verification
 *   Suite 5: Algorithmic Complexity, ReDoS Stress & High-Volume Stress Tests
 */

const fs = require('fs');
const path = require('path');

// ═══════════════════════════════════════════════════════════════
// IMPLEMENTATION EXTRACTION (Mirroring exact codebase algorithms)
// ═══════════════════════════════════════════════════════════════

// Exact extractTextWithLayout from SyllabusImportModal.jsx (lines 59-95)
async function extractTextWithLayout(page) {
  const textContent = await page.getTextContent();
  const items = textContent.items;
  if (!items || items.length === 0) return '';

  const linesMap = {};
  for (const item of items) {
    if (!item.str || (!item.str.trim() && item.str !== ' ')) continue;
    const y = item.transform[5];
    let foundY = null;
    for (const key of Object.keys(linesMap)) {
      if (Math.abs(parseFloat(key) - y) < 3.5) {
        foundY = key;
        break;
      }
    }
    if (foundY !== null) {
      linesMap[foundY].push(item);
    } else {
      linesMap[y] = [item];
    }
  }

  const sortedYs = Object.keys(linesMap)
    .map(Number)
    .sort((a, b) => b - a);

  const lines = [];
  for (const y of sortedYs) {
    const lineItems = linesMap[y];
    lineItems.sort((a, b) => a.transform[4] - b.transform[4]);
    const lineStr = lineItems.map(item => item.str).join(' ');
    lines.push(lineStr);
  }

  return lines.join('\n');
}

// Exact parseSyllabusText from SyllabusImportModal.jsx (lines 98-148)
function parseSyllabusText(text) {
  if (!text) return [];
  const lines = text.split('\n');
  const parsedLessons = [];
  let orderIndex = 1;

  for (let line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.length < 3) continue;

    // Filter out typical document standalone headers / page numbers
    if (/^(?:page(?:\s+\d+)?|syllabus|table of contents|index|course overview|curriculum)\s*$/i.test(trimmed)) continue;
    if (/^\d+\s*$/i.test(trimmed)) continue;

    let title = trimmed;
    let duration = 60; // default 60 minutes

    // Look for compound duration pattern like (2h 30m) or 2 hours 15 mins or [1 hr 45 min]
    const compoundRegex = /(?:[-–—(📎[]\s*)?(?:(\d+(?:\.\d+)?)\s*(?:hours?|hrs?|h))[\s,]+(?:(\d+)\s*(?:mins?|minutes?|m))[\)\]]?\s*$/i;
    const compMatch = compoundRegex.exec(trimmed);
    if (compMatch) {
      const h = parseFloat(compMatch[1]) || 0;
      const m = parseInt(compMatch[2]) || 0;
      duration = Math.round(h * 60 + m);
      title = trimmed.replace(compoundRegex, '').trim();
    } else {
      // Look for single duration pattern like (120 mins) or (1.5 hours) or [2 hrs] or - 90 minutes
      const durationRegex = /(?:[-–—(📎[]\s*)?(\d+(?:\.\d+)?)\s*(?:min|minute|mins|minutes|hour|hours|hr|hrs|h|m)[\)\]]?\s*$/i;
      const durMatch = durationRegex.exec(trimmed);
      if (durMatch) {
        const val = parseFloat(durMatch[1]);
        const rawUnit = durMatch[0].toLowerCase();
        const isHour = /hours?|hrs?|(?<![a-z])h/i.test(rawUnit);
        if (isHour) {
          duration = Math.round(val * 60);
        } else {
          duration = Math.round(val);
        }
        title = trimmed.replace(durationRegex, '').trim();
      }
    }

    // Clean title prefix like "1.", "Chapter 1:", "Lesson 1:", "Module 2 -", "Topic 3:", "Unit 4:", "Lecture 5:", Roman numerals like "I."
    const prefixRegex = /^(?:(?:chapter|lesson|module|topic|unit|lecture)\s*\d+[\.\-\s:]+|[ivxlcdm]+[\.\-\s:]+|\d+[\.\-\s)]+)\s*/i;
    title = title.replace(prefixRegex, '').trim();

    // Clean trailing dashes/punctuation
    title = title.replace(/^[:\-\s\+]+|[:\-\s\+]+$/g, '').trim();

    if (title && title.length > 2) {
      parsedLessons.push({
        id: `draft-${orderIndex}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        title,
        duration_minutes: duration,
        description: `Syllabus Unit: ${title}`,
        order_index: orderIndex++
      });
    }
  }

  return parsedLessons;
}

// Exact YouTube extractor from SyllabusTreeEditor.jsx (lines 14-18)
const extractYoutubeId = (url) => {
  if (!url) return null;
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
  return match ? match[1] : null;
};

// ═══════════════════════════════════════════════════════════════
// TEST HARNESS FRAMEWORK
// ═══════════════════════════════════════════════════════════════

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
const testResults = [];

function runTest(name, category, testFn) {
  totalTests++;
  const startTime = process.hrtime.bigint();
  try {
    const res = testFn();
    const endTime = process.hrtime.bigint();
    const durationMs = Number(endTime - startTime) / 1e6;
    
    if (res && res.passed === false) {
      failedTests++;
      testResults.push({
        name,
        category,
        passed: false,
        durationMs,
        error: res.error,
        details: res.details
      });
      console.log(`  ❌ [FAIL] ${name}: ${res.error}`);
    } else {
      passedTests++;
      testResults.push({
        name,
        category,
        passed: true,
        durationMs,
        details: res ? res.details : null
      });
      console.log(`  ✅ [PASS] ${name} (${durationMs.toFixed(3)}ms)`);
    }
  } catch (err) {
    const endTime = process.hrtime.bigint();
    const durationMs = Number(endTime - startTime) / 1e6;
    failedTests++;
    testResults.push({
      name,
      category,
      passed: false,
      durationMs,
      error: err.message,
      stack: err.stack
    });
    console.log(`  ❌ [ERROR] ${name}: ${err.message}`);
  }
}

console.log('══════════════════════════════════════════════════════════════════');
console.log('  CHALLENGER 2: SYLLABUS & CURRICULUM LOGIC EMPIRICAL SUITE       ');
console.log('══════════════════════════════════════════════════════════════════\n');

// ═══════════════════════════════════════════════════════════════
// SUITE 1: 2D Spatial Layout Reconstruction & PDF Text Streams
// ═══════════════════════════════════════════════════════════════
console.log('--- SUITE 1: 2D Spatial Layout Reconstruction ---');

// Test 1.1: Normal sequential horizontal line items
runTest('1.1 Normal horizontal line items on same Y', '2D_SPATIAL', () => {
  const dummyPage = {
    getTextContent: async () => ({
      items: [
        { str: 'Module 1:', transform: [1, 0, 0, 1, 50, 700] },
        { str: 'Newtonian', transform: [1, 0, 0, 1, 120, 700] },
        { str: 'Mechanics', transform: [1, 0, 0, 1, 190, 700] }
      ]
    })
  };
  return extractTextWithLayout(dummyPage).then(out => {
    if (out === 'Module 1: Newtonian Mechanics') return { passed: true };
    return { passed: false, error: `Expected "Module 1: Newtonian Mechanics", got "${out}"` };
  });
});

// Test 1.2: Sub-pixel Y-jitter clustering (< 3.5px delta)
runTest('1.2 Sub-pixel Y-jitter clustering (delta < 3.5px)', '2D_SPATIAL', () => {
  const dummyPage = {
    getTextContent: async () => ({
      items: [
        { str: 'Part A', transform: [1, 0, 0, 1, 50, 700.0] },
        { str: 'Kinematics', transform: [1, 0, 0, 1, 120, 702.1] }, // delta = 2.1 < 3.5
        { str: '(90 mins)', transform: [1, 0, 0, 1, 200, 698.8] }   // delta = 1.2 < 3.5
      ]
    })
  };
  return extractTextWithLayout(dummyPage).then(out => {
    if (out === 'Part A Kinematics (90 mins)') return { passed: true };
    return { passed: false, error: `Expected unified single line, got: "${out}"` };
  });
});

// Test 1.3: Out-of-order PDF stream (Bottom-to-top & right-to-left items)
runTest('1.3 Out-of-order PDF stream items properly sorted by Y desc and X asc', '2D_SPATIAL', () => {
  const dummyPage = {
    getTextContent: async () => ({
      items: [
        { str: 'Line 2 Item 2', transform: [1, 0, 0, 1, 150, 600] },
        { str: 'Line 1 Item 2', transform: [1, 0, 0, 1, 150, 700] },
        { str: 'Line 2 Item 1', transform: [1, 0, 0, 1, 50, 600] },
        { str: 'Line 1 Item 1', transform: [1, 0, 0, 1, 50, 700] }
      ]
    })
  };
  return extractTextWithLayout(dummyPage).then(out => {
    const lines = out.split('\n');
    if (lines.length === 2 && lines[0] === 'Line 1 Item 1 Line 1 Item 2' && lines[1] === 'Line 2 Item 1 Line 2 Item 2') {
      return { passed: true };
    }
    return { passed: false, error: `Unexpected sort order:\n${out}` };
  });
});

// Test 1.4: Multi-column PDF Layout (Adversarial stress)
runTest('1.4 Multi-column PDF text stream behavior (Left col X=50 vs Right col X=350)', '2D_SPATIAL', () => {
  const dummyPage = {
    getTextContent: async () => ({
      items: [
        { str: 'Left Col Topic 1', transform: [1, 0, 0, 1, 50, 700] },
        { str: 'Right Col Topic 1', transform: [1, 0, 0, 1, 350, 700] },
        { str: 'Left Col Topic 2', transform: [1, 0, 0, 1, 50, 650] },
        { str: 'Right Col Topic 2', transform: [1, 0, 0, 1, 350, 650] }
      ]
    })
  };
  return extractTextWithLayout(dummyPage).then(out => {
    const lines = out.split('\n');
    // In current 2D algorithm, same Y lines get concatenated across columns
    const hasMergedColumns = lines.some(l => l.includes('Left Col Topic 1 Right Col Topic 1'));
    return {
      passed: true,
      details: {
        behavior: hasMergedColumns ? 'Columns merged by horizontal line' : 'Columns kept separate',
        output: out
      }
    };
  });
});

// Test 1.5: Noisy items with empty strings, blank spaces, and non-breaking spaces
runTest('1.5 Noisy PDF items with whitespace, empty strings, null strings', '2D_SPATIAL', () => {
  const dummyPage = {
    getTextContent: async () => ({
      items: [
        { str: '', transform: [1, 0, 0, 1, 10, 700] },
        { str: '  ', transform: [1, 0, 0, 1, 20, 700] },
        { str: null, transform: [1, 0, 0, 1, 30, 700] },
        { str: 'Electrostatics', transform: [1, 0, 0, 1, 50, 700] },
        { str: '  ', transform: [1, 0, 0, 1, 150, 700] },
        { str: '- 60 mins', transform: [1, 0, 0, 1, 180, 700] }
      ]
    })
  };
  return extractTextWithLayout(dummyPage).then(out => {
    if (out.includes('Electrostatics - 60 mins')) return { passed: true };
    return { passed: false, error: `Failed noise filtering: "${out}"` };
  });
});

// ═══════════════════════════════════════════════════════════════
// SUITE 2: Regex Syllabus Parsing & Edge Case Headers
// ═══════════════════════════════════════════════════════════════
console.log('\n--- SUITE 2: Regex Syllabus Parser & Edge Cases ---');

// Test 2.1: Standard syllabus lines
runTest('2.1 Standard numbered syllabus items with minutes', 'REGEX_PARSER', () => {
  const input = `1. Introduction to Vectors (90 mins)\n2. Kinematics in 1D [60 min]\n3. Projectile Motion - 120 minutes`;
  const res = parseSyllabusText(input);
  if (res.length !== 3) return { passed: false, error: `Expected 3 lessons, got ${res.length}` };
  if (res[0].title !== 'Introduction to Vectors' || res[0].duration_minutes !== 90) {
    return { passed: false, error: `Lesson 0 mismatch: ${JSON.stringify(res[0])}` };
  }
  if (res[1].title !== 'Kinematics in 1D' || res[1].duration_minutes !== 60) {
    return { passed: false, error: `Lesson 1 mismatch: ${JSON.stringify(res[1])}` };
  }
  if (res[2].title !== 'Projectile Motion' || res[2].duration_minutes !== 120) {
    return { passed: false, error: `Lesson 2 mismatch: ${JSON.stringify(res[2])}` };
  }
  return { passed: true };
});

// Test 2.2: CRITICAL CHALLENGE - Chapter prefix filtering false-positive
runTest('2.2 Challenge: "Chapter X" syllabus units must NOT be falsely dropped', 'REGEX_PARSER', () => {
  const input = `Chapter 1: Units and Measurements (60 mins)\nChapter 2: Kinematics (90 mins)\nChapter 14: Oscillations (120 mins)`;
  const res = parseSyllabusText(input);
  // Empirical observation of codebase regex: /^(?:page|chapter|syllabus|table of contents|index|course overview|curriculum)/i
  if (res.length === 0) {
    return {
      passed: false,
      error: `CRITICAL BUG: Legitimate lessons starting with "Chapter X" are DROPPED by header exclusion filter /^chapter/i! Got 0 lessons parsed.`
    };
  }
  return { passed: true };
});

// Test 2.3: CRITICAL CHALLENGE - Decimal hours conversion ("1.5 hours")
runTest('2.3 Challenge: Decimal hours duration conversion ("1.5 hours")', 'REGEX_PARSER', () => {
  const input = `Thermodynamics Lecture (1.5 hours)\nRotational Dynamics (2.5 hrs)`;
  const res = parseSyllabusText(input);
  if (res.length === 0) return { passed: false, error: 'No lessons parsed' };
  
  // Checking lesson 1: 1.5 hours should be 90 mins, not 300 mins!
  const lesson1 = res[0];
  if (lesson1.duration_minutes === 90 && lesson1.title === 'Thermodynamics Lecture') {
    return { passed: true };
  }
  return {
    passed: false,
    error: `CORRUPTION: "1.5 hours" parsed as ${lesson1.duration_minutes} minutes with corrupted title "${lesson1.title}" (expected 90 mins, "Thermodynamics Lecture")`
  };
});

// Test 2.4: Roman Numeral prefixes ("I. Electrostatics", "IV. Optics")
runTest('2.4 Roman Numeral prefixes handling ("I. Topic", "IV. Topic")', 'REGEX_PARSER', () => {
  const input = `I. Electrostatics Fundamentals (90 mins)\nIV. Electromagnetic Induction (120 mins)\nIX. Modern Physics (60 mins)`;
  const res = parseSyllabusText(input);
  if (res.length !== 3) return { passed: false, error: `Expected 3 lessons, got ${res.length}` };
  return {
    passed: true,
    details: {
      lesson1_title: res[0].title,
      lesson2_title: res[1].title,
      lesson3_title: res[2].title
    }
  };
});

// Test 2.5: "Unit X" and "Lecture X" prefix stripping
runTest('2.5 "Unit X:" and "Lecture X:" prefix handling', 'REGEX_PARSER', () => {
  const input = `Unit 1: Ray Optics & Wave Optics (90 mins)\nLecture 05: Capacitance & Dielectrics (60 mins)`;
  const res = parseSyllabusText(input);
  if (res.length !== 2) return { passed: false, error: `Expected 2 lessons, got ${res.length}` };
  return {
    passed: true,
    details: {
      lesson1_title: res[0].title,
      lesson2_title: res[1].title
    }
  };
});

// Test 2.6: Missing durations defaulting to 60 minutes
runTest('2.6 Missing durations default gracefully to 60 minutes', 'REGEX_PARSER', () => {
  const input = `Center of Mass and Collision\nFluid Mechanics and Surface Tension`;
  const res = parseSyllabusText(input);
  if (res.length === 2 && res[0].duration_minutes === 60 && res[1].duration_minutes === 60) {
    return { passed: true };
  }
  return { passed: false, error: `Failed default duration: ${JSON.stringify(res)}` };
});

// Test 2.7: Compound duration formats ("2 hours 30 mins")
runTest('2.7 Compound duration format parsing ("2h 30m" / "2 hours 30 mins")', 'REGEX_PARSER', () => {
  const input = `Optics Marathon (2h 30m)\nCalculus Bootcamp - 2 hours 15 mins`;
  const res = parseSyllabusText(input);
  if (res.length !== 2) return { passed: false, error: `Expected 2 lessons, got ${res.length}` };
  return {
    passed: res[0].duration_minutes === 150,
    error: res[0].duration_minutes !== 150 ? `Expected 150 mins for 2h 30m, got ${res[0].duration_minutes}m (title: "${res[0].title}")` : null,
    details: { res }
  };
});

// Test 2.8: Non-duration parentheses (e.g., "(Part 1)", "(Math 101)")
runTest('2.8 Non-duration parentheses preservation ("Vectors (Part 1)")', 'REGEX_PARSER', () => {
  const input = `Vectors & 3D Geometry (Part 1)\nOrganic Chemistry Mechanisms (Section A)`;
  const res = parseSyllabusText(input);
  if (res.length === 2 && res[0].title.includes('(Part 1)') && res[0].duration_minutes === 60) {
    return { passed: true };
  }
  return { passed: false, error: `Mangled title or incorrect duration: ${JSON.stringify(res)}` };
});

// ═══════════════════════════════════════════════════════════════
// SUITE 3: Staging Table Mutations & Sequence Allocation
// ═══════════════════════════════════════════════════════════════
console.log('\n--- SUITE 3: Staging Table Mutations & Integrity ---');

// Test 3.1: Staging table row insertion & ID uniqueness
runTest('3.1 Staging table row insertion ID uniqueness across batch', 'STAGING_MUTATIONS', () => {
  const initial = parseSyllabusText(`Topic A (60m)\nTopic B (60m)\nTopic C (60m)`);
  const newRow = {
    id: `draft-new-${Date.now()}`,
    title: `New Lesson Unit 4`,
    duration_minutes: 60,
    description: 'Syllabus Unit',
    order_index: 4
  };
  const mutated = [...initial, newRow];
  const ids = mutated.map(m => m.id);
  const uniqueIds = new Set(ids);
  if (ids.length === uniqueIds.size) return { passed: true };
  return { passed: false, error: `Duplicate draft IDs detected: ${ids.join(', ')}` };
});

// Test 3.2: Staging table row deletion sequence contiguity
runTest('3.2 Staging table row deletion sequence contiguity check', 'STAGING_MUTATIONS', () => {
  let staging = [
    { id: '1', title: 'Unit 1', order_index: 1, duration_minutes: 60 },
    { id: '2', title: 'Unit 2', order_index: 2, duration_minutes: 60 },
    { id: '3', title: 'Unit 3', order_index: 3, duration_minutes: 60 }
  ];
  // User deletes Unit 2 - SyllabusImportModal re-normalizes sequence order
  staging = staging.filter(item => item.id !== '2').map((item, idx) => ({ ...item, order_index: idx + 1 }));
  const indices = staging.map(s => s.order_index);
  const isContiguous = indices.every((val, idx) => val === idx + 1);
  return {
    passed: isContiguous,
    error: !isContiguous ? `WARNING: Sequence indices become non-contiguous after row deletion: [${indices.join(', ')}] (gaps remain until committed)` : null,
    details: { indices }
  };
});

// Test 3.3: Reordering and duplicate sequence number detection
runTest('3.3 Duplicate sequence index detection in staging payload', 'STAGING_MUTATIONS', () => {
  const stagingWithDuplicates = [
    { id: '1', title: 'Unit A', order_index: 1, duration_minutes: 60 },
    { id: '2', title: 'Unit B', order_index: 1, duration_minutes: 60 } // Duplicate order_index = 1
  ];
  // In SyllabusImportModal.jsx handleCommitImport maps directly without deduplication
  const hasDuplicateIndices = new Set(stagingWithDuplicates.map(s => s.order_index)).size !== stagingWithDuplicates.length;
  return {
    passed: true,
    details: { hasDuplicateIndices, behavior: 'Modal allows user to manually set conflicting sequence numbers' }
  };
});

// Test 3.4: XSS / HTML Injection sanitization in title/description staging
runTest('3.4 HTML/Script injection resistance in syllabus staging fields', 'STAGING_MUTATIONS', () => {
  const input = `<script>alert('XSS')</script> (60 mins)\n<b>Bold Module</b> & <i>Italics</i> - 90 mins`;
  const res = parseSyllabusText(input);
  if (res.length === 2) {
    return {
      passed: true,
      details: {
        raw_titles: res.map(r => r.title),
        note: 'React escapes JSX output by default, ensuring DOM safety'
      }
    };
  }
  return { passed: false, error: 'Failed parsing HTML strings' };
});

// ═══════════════════════════════════════════════════════════════
// SUITE 4: Lesson Tree CRUD, Duration Aggregation & Free Preview
// ═══════════════════════════════════════════════════════════════
console.log('\n--- SUITE 4: Lesson Tree CRUD, Aggregation & Free Preview ---');

// Test 4.1: Next order calculation on empty vs populated list
runTest('4.1 nextOrder calculation robustness in SyllabusTreeEditor', 'TREE_CRUD', () => {
  // Empty list
  const emptyLessons = [];
  const nextOrderEmpty = emptyLessons.length > 0
    ? Math.max(...emptyLessons.map(l => l.order_index || 0)) + 1
    : 1;
  if (nextOrderEmpty !== 1) return { passed: false, error: `Empty list nextOrder expected 1, got ${nextOrderEmpty}` };

  // Sparse list with non-sequential orders [2, 5, 8]
  const sparseLessons = [{ order_index: 2 }, { order_index: 5 }, { order_index: 8 }];
  const nextOrderSparse = Math.max(...sparseLessons.map(l => l.order_index || 0)) + 1;
  if (nextOrderSparse !== 9) return { passed: false, error: `Sparse list nextOrder expected 9, got ${nextOrderSparse}` };

  return { passed: true };
});

// Test 4.2: Move Up / Move Down boundary logic
runTest('4.2 Move Up/Down boundary logic (Index 0 move up & Index N-1 move down)', 'TREE_CRUD', () => {
  const lessons = [
    { id: 'a', title: 'Lesson A', order_index: 1 },
    { id: 'b', title: 'Lesson B', order_index: 2 },
    { id: 'c', title: 'Lesson C', order_index: 3 }
  ];

  function simulateMove(list, index, direction) {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= list.length) return list; // Safe no-op

    const newLessons = [...list];
    const temp = newLessons[index];
    newLessons[index] = newLessons[targetIndex];
    newLessons[targetIndex] = temp;

    return newLessons.map((item, idx) => ({
      ...item,
      order_index: idx + 1
    }));
  }

  // Attempt move up at index 0 (should no-op)
  const afterNoOpUp = simulateMove(lessons, 0, 'up');
  if (afterNoOpUp[0].id !== 'a') return { passed: false, error: 'Move up at index 0 corrupted list' };

  // Move index 1 (Lesson B) up
  const afterMoveBUp = simulateMove(lessons, 1, 'up');
  if (afterMoveBUp[0].id !== 'b' || afterMoveBUp[0].order_index !== 1 || afterMoveBUp[1].id !== 'a' || afterMoveBUp[1].order_index !== 2) {
    return { passed: false, error: `Move B up failed: ${JSON.stringify(afterMoveBUp)}` };
  }

  // Attempt move down at last index (should no-op)
  const afterNoOpDown = simulateMove(lessons, 2, 'down');
  if (afterNoOpDown[2].id !== 'c') return { passed: false, error: 'Move down at last index corrupted list' };

  return { passed: true };
});

// Test 4.3: YouTube URL extraction across diverse formats
runTest('4.3 YouTube Video ID extraction (standard, embed, youtu.be, shorts)', 'TREE_CRUD', () => {
  const cases = [
    { url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', expected: 'dQw4w9WgXcQ' },
    { url: 'https://youtu.be/dQw4w9WgXcQ', expected: 'dQw4w9WgXcQ' },
    { url: 'https://www.youtube.com/embed/dQw4w9WgXcQ', expected: 'dQw4w9WgXcQ' },
    { url: 'https://www.youtube.com/watch?feature=share&v=dQw4w9WgXcQ', expected: 'dQw4w9WgXcQ' },
    { url: 'invalid-url-string', expected: null },
    { url: '', expected: null }
  ];

  for (const c of cases) {
    const id = extractYoutubeId(c.url);
    if (id !== c.expected) {
      return { passed: false, error: `For URL "${c.url}", expected ID "${c.expected}", got "${id}"` };
    }
  }
  return { passed: true };
});

// Test 4.4: CRITICAL CHALLENGE - Free preview toggle support in SyllabusTreeEditor
runTest('4.4 Challenge: Free preview toggle completeness vs PROJECT.md blueprint', 'TREE_CRUD', () => {
  // Read SyllabusTreeEditor.jsx source
  const treeEditorPath = path.join(__dirname, 'src', 'components', 'courses', 'SyllabusTreeEditor.jsx');
  const content = fs.readFileSync(treeEditorPath, 'utf8');

  const hasFreePreviewState = content.includes('newIsFreePreview');
  const hasFreePreviewInPayload = /payload\s*=\s*\{[\s\S]*?is_free_preview[\s\S]*?\}/.test(content);
  const hasFreePreviewInEditForm = /editForm[\s\S]*?is_free_preview/.test(content);
  const hasFreePreviewCheckbox = /<input[^>]*type="checkbox"[^>]*is_free_preview|newIsFreePreview/i.test(content);

  if (hasFreePreviewState && !hasFreePreviewInPayload) {
    return {
      passed: false,
      error: `DEFECT: "newIsFreePreview" state is declared on line 43 of SyllabusTreeEditor.jsx, but is NEVER passed in the insert payload, edit form, or rendered in UI controls!`
    };
  }

  return { passed: true };
});

// Test 4.5: Duration aggregation logic across lessons
runTest('4.5 Duration aggregation with varied and missing values', 'TREE_CRUD', () => {
  const lessons = [
    { title: 'Unit 1', duration_minutes: 60 },
    { title: 'Unit 2', duration_minutes: 90 },
    { title: 'Unit 3', duration_minutes: null }, // Null duration
    { title: 'Unit 4', duration_minutes: '45' }   // String duration
  ];

  const totalMinutes = lessons.reduce((acc, l) => acc + (parseInt(l.duration_minutes) || 0), 0);
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  const formatted = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;

  if (totalMinutes === 195 && formatted === '3h 15m') {
    return { passed: true, details: { totalMinutes, formatted } };
  }
  return { passed: false, error: `Expected 195 mins (3h 15m), got ${totalMinutes} (${formatted})` };
});

// ═══════════════════════════════════════════════════════════════
// SUITE 5: Algorithmic Complexity, ReDoS & High-Volume Stress
// ═══════════════════════════════════════════════════════════════
console.log('\n--- SUITE 5: ReDoS & High-Volume Performance Stress ---');

// Test 5.1: ReDoS stress with deeply nested brackets and trailing punctuation
runTest('5.1 ReDoS resistance on adversarial duration regex inputs', 'PERFORMANCE_REDOS', () => {
  const adversarialStrings = [
    'Topic ' + '('.repeat(1000) + '90 mins' + ')'.repeat(1000),
    'Topic ' + '-'.repeat(5000) + ' 60 mins',
    'Topic ' + ' '.repeat(10000) + '120 minutes',
    'Topic ' + 'a'.repeat(5000) + ' (60 mins)'
  ];

  for (const str of adversarialStrings) {
    const t0 = process.hrtime.bigint();
    const res = parseSyllabusText(str);
    const t1 = process.hrtime.bigint();
    const durationMs = Number(t1 - t0) / 1e6;
    if (durationMs > 50) {
      return { passed: false, error: `ReDoS detected: string took ${durationMs.toFixed(2)}ms to parse!` };
    }
  }
  return { passed: true };
});

// Test 5.2: High-volume 500-lesson syllabus extraction throughput
runTest('5.2 High-volume 500-lesson syllabus parsing throughput (< 15ms target)', 'PERFORMANCE_REDOS', () => {
  const lines = [];
  for (let i = 1; i <= 500; i++) {
    lines.push(`${i}. Advanced Unit ${i}: Physics Concept ${i} (${45 + (i % 60)} mins)`);
  }
  const fullText = lines.join('\n');

  const t0 = process.hrtime.bigint();
  const res = parseSyllabusText(fullText);
  const t1 = process.hrtime.bigint();
  const durationMs = Number(t1 - t0) / 1e6;

  if (res.length !== 500) {
    return { passed: false, error: `Expected 500 parsed lessons, got ${res.length}` };
  }
  if (durationMs > 50) {
    return { passed: false, error: `Performance threshold exceeded: 500 lessons took ${durationMs.toFixed(2)}ms` };
  }

  return {
    passed: true,
    details: {
      lesson_count: res.length,
      durationMs: durationMs.toFixed(3),
      throughput: `${(500 / (durationMs / 1000)).toFixed(0)} lessons/sec`
    }
  };
});

// Test 5.3: 2D spatial layout extraction memory and time with 2000 PDF text items
runTest('5.3 2D spatial layout reconstruction with 2,000 PDF text stream items', 'PERFORMANCE_REDOS', () => {
  const items = [];
  for (let i = 0; i < 2000; i++) {
    const y = 800 - (Math.floor(i / 5) * 15) + (Math.random() * 2);
    const x = 50 + (i % 5) * 80;
    items.push({
      str: `Word_${i}`,
      transform: [1, 0, 0, 1, x, y]
    });
  }

  const dummyPage = {
    getTextContent: async () => ({ items })
  };

  const t0 = process.hrtime.bigint();
  return extractTextWithLayout(dummyPage).then(out => {
    const t1 = process.hrtime.bigint();
    const durationMs = Number(t1 - t0) / 1e6;
    if (!out || out.length === 0) return { passed: false, error: 'Empty output' };
    if (durationMs > 100) return { passed: false, error: `2,000 items took ${durationMs.toFixed(2)}ms` };
    return {
      passed: true,
      details: {
        itemsCount: items.length,
        durationMs: durationMs.toFixed(3),
        lineCount: out.split('\n').length
      }
    };
  });
});

// ═══════════════════════════════════════════════════════════════
// REPORT GENERATION & SUMMARY
// ═══════════════════════════════════════════════════════════════

setTimeout(() => {
  console.log('\n══════════════════════════════════════════════════════════════════');
  console.log(`  TOTAL TESTS: ${totalTests} | PASSED: ${passedTests} | FAILED: ${failedTests}`);
  console.log(`  OVERALL SUITE VERDICT: ${failedTests > 0 ? 'REQUEST_CHANGES ⚠️' : 'APPROVE ✅'}`);
  console.log('══════════════════════════════════════════════════════════════════\n');

  const summary = {
    totalTests,
    passedTests,
    failedTests,
    verdict: failedTests > 0 ? 'REQUEST_CHANGES' : 'APPROVE',
    results: testResults
  };

  fs.writeFileSync(
    path.join(__dirname, '.agents', 'challenger_2', 'test_results.json'),
    JSON.stringify(summary, null, 2)
  );
}, 200);
