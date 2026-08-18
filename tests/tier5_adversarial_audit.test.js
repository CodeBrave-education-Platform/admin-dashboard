const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

function runTier5Tests() {
  let passed = 0;
  let failed = 0;
  function check(title, fn) {
    try {
      fn();
      passed++;
      console.log('  ✅ PASS: ' + title);
    } catch (err) {
      failed++;
      console.error('  ❌ FAIL: ' + title + ' -> ' + err.message);
    }
  }

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('⚡ TIER 5: ADVERSARIAL REVIEWER VERIFICATION & AUDIT (ISS-001..5) ⚡');
  console.log('═══════════════════════════════════════════════════════════════\n');

  console.log('🔵 SUITE 5.1: PDF.js & Document Loaders CDN Integrity (ISS-001, ISS-002)');
  const pdfFiles = [
    'src/components/batches/BatchRosterImportModal.jsx',
    'src/components/courses/SyllabusImportModal.jsx',
    'src/components/CourseManageClient.jsx',
    'src/components/UniversalPdfImporterModal.jsx'
  ];

  pdfFiles.forEach(file => {
    check('File exists: ' + file, () => assert.strictEqual(fs.existsSync(file), true));
    const c = fs.readFileSync(file, 'utf8');
    check(path.basename(file) + ': CDN 3.11.174 URLs', () => {
      assert.match(c, /https:\/\/cdnjs\.cloudflare\.com\/ajax\/libs\/pdf\.js\/3\.11\.174\/pdf\.min\.js/);
      assert.match(c, /https:\/\/cdnjs\.cloudflare\.com\/ajax\/libs\/pdf\.js\/3\.11\.174\/pdf\.worker\.min\.js/);
    });
    check(path.basename(file) + ': Dual window key access (pdfjsLib and window[pdfjs-dist])', () => {
      assert.match(c, /window\.pdfjsLib\s*\|\|\s*window\['pdfjs-dist\/build\/pdf'\]/);
    });
    check(path.basename(file) + ': Safe GlobalWorkerOptions initialization', () => {
      assert.match(c, /if\s*\(!existing\.GlobalWorkerOptions\)\s*{\s*existing\.GlobalWorkerOptions\s*=\s*{};\s*}/);
    });
    check(path.basename(file) + ': Corrupted file error catch block with error toast', () => {
      assert.match(c, /catch\s*\(\w+\)\s*{[^}]*(showToast|triggerToast)/s);
    });
  });

  check('next.config.mjs: CSP headers allow cdnjs scripts and workers', () => {
    const nextConfig = fs.readFileSync('next.config.mjs', 'utf8');
    assert.match(nextConfig, /script-src[^;]*https:\/\/cdnjs\.cloudflare\.com/);
    assert.match(nextConfig, /worker-src[^;]*https:\/\/cdnjs\.cloudflare\.com/);
  });

  console.log('\n🔵 SUITE 5.2: Infinite Loop Elimination & Telemetry Cleanup (ISS-003, ISS-004)');
  check('test-series page: handleExamsUpdated in useCallback', () => {
    const c = fs.readFileSync('src/app/admin/test-series/page.js', 'utf8');
    assert.match(c, /const\s+handleExamsUpdated\s*=\s*useCallback\(/);
  });

  check('Drawer: fetchPackageExams does not trigger onExamsUpdated on read', () => {
    const c = fs.readFileSync('src/components/test-series/TestSeriesEditorDrawer.jsx', 'utf8');
    const match = c.match(/const fetchPackageExams = useCallback\(async \(\) => {([\s\S]*?)}, \[packageData\?\.id, supabase\]\);/);
    assert.ok(match);
    assert.strictEqual(match[1].includes('onExamsUpdated(data)'), false);
  });

  check('LiveTelemetryTab: polling interval cleared on unmount', () => {
    const c = fs.readFileSync('src/components/test-series/tabs/LiveTelemetryTab.jsx', 'utf8');
    assert.match(c, /clearInterval\(interval\)/);
  });

  check('SubmissionsTab: examIdsKey string memoization in useEffect deps', () => {
    const c = fs.readFileSync('src/components/test-series/tabs/SubmissionsTab.jsx', 'utf8');
    assert.match(c, /const\s+examIdsKey\s*=\s*examIds\.join\(','\);/);
    assert.match(c, /\}, \[packageData\?\.id, examIdsKey\]\);/);
  });

  console.log('\n🔵 SUITE 5.3: Zero Alerts & Debug UI Text (ISS-005)');
  function walk(dir) {
    let fList = [];
    for (const f of fs.readdirSync(dir)) {
      const full = path.join(dir, f);
      if (f === 'node_modules' || f === '.next' || f === '.git') continue;
      if (fs.statSync(full).isDirectory()) fList = fList.concat(walk(full));
      else if (/\.(jsx?|tsx?)$/.test(f)) fList.push(full);
    }
    return fList;
  }
  const allFiles = walk('src');
  check('Zero alert() in all ' + allFiles.length + ' files', () => {
    const matches = [];
    for (const f of allFiles) {
      const c = fs.readFileSync(f, 'utf8');
      c.split('\n').forEach((l, idx) => {
        if (/\balert\s*\(/.test(l)) matches.push(f + ':' + (idx+1));
      });
    }
    assert.strictEqual(matches.length, 0);
  });

  check('Zero debug text Beta-Console in all files', () => {
    const matches = [];
    for (const f of allFiles) {
      const c = fs.readFileSync(f, 'utf8');
      c.split('\n').forEach((l, idx) => {
        if (/beta[- ]console/i.test(l)) matches.push(f + ':' + (idx+1));
      });
    }
    assert.strictEqual(matches.length, 0);
  });

  console.log('\n🔵 SUITE 5.4: Supabase Null Safety Across Pages');
  const pages = [
    'src/app/admin/books/page.js',
    'src/app/admin/books/orders/page.js',
    'src/app/admin/invoices/page.js',
    'src/app/admin/students/page.js',
    'src/app/admin/test-series/compiler/page.js',
    'src/app/admin/test-series/monitor/[examId]/page.js',
    'src/app/batches/page.js',
    'src/app/courses/page.js',
    'src/app/gradebook/page.js',
    'src/app/page.js'
  ];
  pages.forEach(p => {
    check(p + ': Has null safety fallback guards', () => {
      const c = fs.readFileSync(p, 'utf8');
      assert.ok(
        c.includes('|| []') ||
        c.includes('if (data') ||
        c.includes('if (db') ||
        c.includes('if (profile') ||
        c.includes('if (auth') ||
        c.includes('fallback') ||
        c.includes('notFound()') ||
        c.includes('redirect(')
      );
    });
  });

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('📊 TIER 5 RESULTS: Passed: ' + passed + ' | Failed: ' + failed);
  console.log('═══════════════════════════════════════════════════════════════\n');
  return { passed, failed };
}

if (require.main === module) {
  const res = runTier5Tests();
  if (res.failed > 0) process.exit(1);
}
module.exports = { runTier5Tests };
