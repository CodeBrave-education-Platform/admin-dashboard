const fs = require('fs');
const path = require('path');
const vm = require('vm');

async function loadParser() {
  const possiblePaths = [
    path.resolve(process.cwd(), 'src/app/api/admin/ai/parse-pdf/route.js'),
    path.resolve(__dirname, 'src/app/api/admin/ai/parse-pdf/route.js'),
    path.resolve(__dirname, '../../src/app/api/admin/ai/parse-pdf/route.js')
  ];

  let routePath = possiblePaths.find(p => fs.existsSync(p));
  if (!routePath) {
    throw new Error('Could not locate route.js in expected directories: ' + JSON.stringify(possiblePaths));
  }

  // Strategy 1: Try native dynamic import if supported
  try {
    const fileUrl = 'file:///' + routePath.replace(/\\/g, '/');
    const esmModule = await import(fileUrl);
    if (esmModule) {
      const fn = esmModule.parseTextToQuestions || esmModule.parseExamPdfText || esmModule.parseExtractedText;
      if (typeof fn === 'function') return { parse: fn, source: 'esm_export' };
      if (typeof esmModule.POST === 'function') return { postHandler: esmModule.POST, source: 'esm_post' };
    }
  } catch (esmErr) {
    // Dynamic import failed, fallback to VM evaluation
  }

  // Strategy 2: Sandboxed VM evaluation with Next.js polyfills
  const rawCode = fs.readFileSync(routePath, 'utf8');
  
  // Transform ES module syntax for VM execution
  let transformed = rawCode
    .replace(/import\s*\{\s*NextResponse\s*\}\s*from\s*['"]next\/server['"];?/g, 'const { NextResponse } = require("next/server");')
    .replace(/import\s+.*?from\s+['"].*?['"];?/g, '// import removed')
    .replace(/export\s+async\s+function\s+([a-zA-Z0-9_$]+)/g, 'async function $1')
    .replace(/export\s+function\s+([a-zA-Z0-9_$]+)/g, 'function $1')
    .replace(/export\s+const\s+([a-zA-Z0-9_$]+)/g, 'const $1')
    .replace(/export\s+default\s+/g, 'module.exports = ');

  const sandbox = {
    require,
    console,
    process,
    Buffer,
    setTimeout,
    clearTimeout,
    Date,
    Math,
    RegExp,
    Array,
    Object,
    String,
    Number,
    Boolean,
    JSON,
    Map,
    Set,
    module: { exports: {} },
    exports: {}
  };
  sandbox.global = sandbox;
  sandbox.globalThis = sandbox;

  vm.createContext(sandbox);
  const wrappedCode = `
    ${transformed}
    
    module.exports = {
      parseTextToQuestions: typeof parseTextToQuestions !== 'undefined' ? parseTextToQuestions : undefined,
      parseExamPdfText: typeof parseExamPdfText !== 'undefined' ? parseExamPdfText : undefined,
      parseExtractedText: typeof parseExtractedText !== 'undefined' ? parseExtractedText : undefined,
      parseQuestionBlock: typeof parseQuestionBlock !== 'undefined' ? parseQuestionBlock : undefined,
      cleanExtractedText: typeof cleanExtractedText !== 'undefined' ? cleanExtractedText : undefined,
      detectSubject: typeof detectSubject !== 'undefined' ? detectSubject : undefined,
      POST: typeof POST !== 'undefined' ? POST : undefined,
      ...module.exports
    };
  `;

  vm.runInContext(wrappedCode, sandbox);
  const exp = sandbox.module.exports;
  const fn = exp.parseTextToQuestions || exp.parseExamPdfText || exp.parseExtractedText;
  if (typeof fn === 'function') {
    return { parse: fn, source: 'vm_function', exports: exp };
  }
  if (typeof exp.POST === 'function') {
    return { postHandler: exp.POST, source: 'vm_post', exports: exp };
  }

  throw new Error('Could not find any parsing function or POST handler in route.js');
}

(async () => {
  try {
    const parser = await loadParser();
    console.log('Parser loaded successfully via source:', parser.source);
    console.log('Testing execution on dummy text...');
    const res = parser.parse('Q1. What is force?\n(A) ma\n(B) mg\n(C) mv\n(D) m/a\nAns: A');
    console.log('Parsed result count:', Array.isArray(res) ? res.length : (res && res.questions ? res.questions.length : 'unknown'));
  } catch (err) {
    console.error('Failed to load parser:', err.message);
  }
})();
