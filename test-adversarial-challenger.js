/**
 * test-adversarial-challenger.js
 * 
 * Challenger 1 (Payload & SDK Adversarial Stress Test Suite)
 * 
 * Comprehensive adversarial verification for src/app/api/admin/ai/parse-pdf/route.js:
 *   Suite 1: Payload Edge Cases, Base64 Formats & Binary Handling
 *   Suite 2: Markdown Fencing, Response Wrappers & Malformed Output
 *   Suite 3: STEM Content Fidelity (Negative Numbers, Complex Chemistry, Matrix Match, Assertion-Reason)
 *   Suite 4: API Key Configurations, Failovers & Error Resilience
 *   Suite 5: Deterministic Fallback & Noise Resistance
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

// ═══════════════════════════════════════════════════════════════
// 1. ADVERSARIAL FIXTURES & SAMPLES
// ═══════════════════════════════════════════════════════════════

const DUMMY_RAW_BASE64 = 'JVBERi0xLjQKJcTl8uXrp/Og0MTGCjEgMCBvYmoKPDwvVHlwZSAvQ2F0YWxvZwovUGFnZXMgMiAwIFI+PgplbmRvYmoKMiAwIG9iago8PC9UeXBlIC9QYWdlcwovS2lkcyBbMyAwIFJdCi9Db3VudCAxCj4+CmVuZG9iagozIDAgb2JqCjw8L1R5cGUgL1BhZ2UKL1BhcmVudCAyIDAgUgovTWVkaWFCb3ggWzAgMCA2MTIgNzkyXQo+PgplbmRvYmoKeHJlZgowIDQKMDAwMDAwMDAwMCA2NTUzNSBmIAowMDAwMDAwMDE1IDAwMDAwIG4gCjAwMDAwMDAwNjggMDAwMDAgbiAKMDAwMDAwMDEyNSAwMDAwMCBuIAp0cmFpbGVyCjw8L1NpemUgND4+CnN0YXJ0eHJlZgoxOTkKJSVFT0Y=';
const DUMMY_DATA_URL_PDF = `data:application/pdf;base64,${DUMMY_RAW_BASE64}`;
const DUMMY_OCTET_DATA_URL = `data:application/octet-stream;base64,${DUMMY_RAW_BASE64}`;

const COMPLEX_STEM_GEMINI_OUTPUT = {
  success: true,
  parserType: 'gemini_ai_multimodal',
  questions_count: 5,
  questions: [
    {
      id: 'pdf-q-1-test',
      subject: 'Physics',
      sub_topic: 'Rotational Dynamics',
      difficulty: 'HARD',
      formatType: 'single_mcq',
      content: 'A cylinder rolls with acceleration $a = \\frac{2}{3} g \\sin \\theta$. Find $a$.',
      options: ['$g \\sin \\theta$', '$\\frac{2}{3} g \\sin \\theta$', '$\\frac{1}{2} g \\sin \\theta$', '$\\frac{3}{4} g \\sin \\theta$'],
      correct_option_index: 1,
      correct_answer: '$\\frac{2}{3} g \\sin \\theta$',
      explanation: 'Using $I = \\frac{1}{2}MR^2$, acceleration is $\\frac{2}{3} g \\sin \\theta$.',
      marks: { positive: 4, negative: -1 }
    },
    {
      id: 'pdf-q-2-test',
      subject: 'Chemistry',
      sub_topic: 'Coordination Compounds',
      difficulty: 'HARD',
      formatType: 'multi_mcq',
      content: 'Which of the following coordination complexes is/are diamagnetic with square planar geometry?',
      options: ['[Ni(CN)_4]^{2-}', '[PtCl_4]^{2-}', '[NiCl_4]^{2-}', '[CoF_6]^{3-}'],
      correct_option_index: 0,
      correct_answer: '[Ni(CN)_4]^{2-}, [PtCl_4]^{2-}',
      explanation: 'Both $[Ni(CN)_4]^{2-}$ and $[PtCl_4]^{2-}$ have $dsp^2$ hybridization.',
      marks: { positive: 4, negative: -2 }
    },
    {
      id: 'pdf-q-3-test',
      subject: 'Mathematics',
      sub_topic: 'Calculus',
      difficulty: 'MEDIUM',
      formatType: 'numerical',
      content: 'Find the minimum value of $f(x) = 2x^3 - 9x^2 + 12x - 5$ on $[0, 3]$.',
      options: [],
      correct_option_index: 0,
      correct_answer: '-5',
      explanation: 'Critical points at x=1,2. Absolute minimum is f(0) = -5.',
      marks: { positive: 4, negative: 0 }
    },
    {
      id: 'pdf-q-4-test',
      subject: 'Biology',
      sub_topic: 'Cellular Respiration',
      difficulty: 'MEDIUM',
      formatType: 'assertion_reason',
      content: '**Assertion (A):** Glycolysis occurs in cytoplasm.\n**Reason (R):** It does not require O2.',
      options: [
        'Both (A) and (R) are true and (R) is correct explanation of (A)',
        'Both (A) and (R) are true but (R) is NOT correct explanation of (A)',
        '(A) is true but (R) is false',
        '(A) is false but (R) is true'
      ],
      correct_option_index: 0,
      correct_answer: 'Both (A) and (R) are true and (R) is correct explanation of (A)',
      explanation: 'Glycolysis takes place in cytosol and is anaerobic.',
      marks: { positive: 4, negative: -1 }
    },
    {
      id: 'pdf-q-5-test',
      subject: 'Physics',
      sub_topic: 'AC Circuits',
      difficulty: 'HARD',
      formatType: 'matrix_match',
      content: 'Match Column I with Column II:\n(A) Resonance (B) Inductive\n(P) Voltage leads (Q) Z = R',
      options: [
        'A->Q, B->P, C->R, D->S',
        'A->P, B->Q, C->R, D->S',
        'A->R, B->P, C->Q, D->S',
        'A->S, B->R, C->P, D->Q'
      ],
      correct_option_index: 0,
      correct_answer: 'A->Q, B->P, C->R, D->S',
      explanation: 'Resonance matches Z = R.',
      marks: { positive: 4, negative: -1 }
    }
  ]
};

// ═══════════════════════════════════════════════════════════════
// 2. MOCK ENVIRONMENT & SANDBOX ROUTE LOADER
// ═══════════════════════════════════════════════════════════════

function createMockGenAIState() {
  const state = {
    instances: [],
    generateContentCalls: [],
    responseProvider: () => ({
      text: JSON.stringify(COMPLEX_STEM_GEMINI_OUTPUT)
    })
  };

  class MockGoogleGenAI {
    constructor(config) {
      this.config = config;
      state.instances.push(this);
      this.models = {
        generateContent: async (params) => {
          state.generateContentCalls.push(params);
          const res = typeof state.responseProvider === 'function'
            ? await state.responseProvider(params)
            : state.responseProvider;

          if (res instanceof Error) {
            throw res;
          }
          return res;
        }
      };
    }
  }

  return { state, MockGoogleGenAI };
}

function createMockRequest({ type = 'json', body = {}, formDataMap = new Map(), headers = {} } = {}) {
  const normalizedHeaders = new Map();
  for (const [k, v] of Object.entries(headers)) {
    normalizedHeaders.set(k.toLowerCase(), v);
  }

  if (type === 'json' && !normalizedHeaders.has('content-type')) {
    normalizedHeaders.set('content-type', 'application/json');
  } else if (type === 'form-data' && !normalizedHeaders.has('content-type')) {
    normalizedHeaders.set('content-type', 'multipart/form-data; boundary=----WebKitFormBoundary7MA4YWxkTrZu0gW');
  }

  return {
    headers: {
      get: (headerName) => normalizedHeaders.get(headerName.toLowerCase()) || null,
      has: (headerName) => normalizedHeaders.has(headerName.toLowerCase())
    },
    json: async () => {
      if (type === 'form-data') throw new Error('Request is multipart/form-data, not JSON');
      return body;
    },
    text: async () => {
      return type === 'json' ? JSON.stringify(body) : '';
    },
    formData: async () => {
      if (type === 'json') {
        const m = new Map();
        for (const [k, v] of Object.entries(body)) m.set(k, v);
        return {
          get: (k) => m.get(k) || null,
          entries: () => m.entries()
        };
      }
      return {
        get: (k) => formDataMap.get(k) || null,
        entries: () => formDataMap.entries()
      };
    }
  };
}

function loadRouteWithMock(mockState, envOverrides = {}) {
  const possiblePaths = [
    path.resolve(process.cwd(), 'src/app/api/admin/ai/parse-pdf/route.js'),
    path.resolve(__dirname, 'src/app/api/admin/ai/parse-pdf/route.js'),
    path.resolve(__dirname, '../../src/app/api/admin/ai/parse-pdf/route.js')
  ];

  const routePath = possiblePaths.find(p => fs.existsSync(p));
  if (!routePath) {
    throw new Error(`Cannot find parser route file in: ${JSON.stringify(possiblePaths)}`);
  }

  const rawCode = fs.readFileSync(routePath, 'utf8');

  const MockNextResponse = {
    json: (data, init = {}) => {
      return {
        status: init.status || 200,
        headers: new Map(Object.entries(init.headers || {})),
        _data: data,
        json: async () => data
      };
    }
  };

  const transformed = rawCode
    .replace(/import\s*\{\s*GoogleGenAI\s*\}\s*from\s*['"]@google\/genai['"];?/g, 'const { GoogleGenAI } = require("@google/genai");')
    .replace(/import\s*\{\s*NextResponse\s*\}\s*from\s*['"]next\/server['"];?/g, 'const { NextResponse } = require("next/server");')
    .replace(/import\s+.*?from\s+['"].*?['"];?/g, '// stripped import')
    .replace(/export\s+async\s+function\s+([a-zA-Z0-9_$]+)/g, 'async function $1')
    .replace(/export\s+function\s+([a-zA-Z0-9_$]+)/g, 'function $1')
    .replace(/export\s+const\s+([a-zA-Z0-9_$]+)/g, 'const $1')
    .replace(/export\s+default\s+/g, 'module.exports = ');

  const currentEnv = {
    ...process.env,
    GEMINI_API_KEY: 'test-gemini-mock-api-key-key-12345',
    GOOGLE_GENAI_API_KEY: '',
    GOOGLE_API_KEY: '',
    ...envOverrides
  };

  const customRequire = (id) => {
    if (id === '@google/genai') {
      return { GoogleGenAI: mockState.MockGoogleGenAI };
    }
    if (id === 'next/server') {
      return { NextResponse: MockNextResponse };
    }
    try {
      return require(id);
    } catch (_err) {
      return {};
    }
  };

  const sandbox = {
    require: customRequire,
    console,
    process: {
      ...process,
      env: currentEnv
    },
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

  const wrapperCode = `
    ${transformed}

    module.exports = {
      POST: typeof POST !== 'undefined' ? POST : undefined,
      sanitizeGeminiQuestions: typeof sanitizeGeminiQuestions !== 'undefined' ? sanitizeGeminiQuestions : undefined,
      parseExtractedText: typeof parseExtractedText !== 'undefined' ? parseExtractedText : undefined,
      parseQuestionBlock: typeof parseQuestionBlock !== 'undefined' ? parseQuestionBlock : undefined,
      cleanExtractedText: typeof cleanExtractedText !== 'undefined' ? cleanExtractedText : undefined,
      detectSubject: typeof detectSubject !== 'undefined' ? detectSubject : undefined,
      ...module.exports
    };
  `;

  vm.runInContext(wrapperCode, sandbox);
  const exp = sandbox.module.exports;

  return {
    POST: exp.POST,
    sanitizeGeminiQuestions: exp.sanitizeGeminiQuestions,
    parseExtractedText: exp.parseExtractedText,
    parseQuestionBlock: exp.parseQuestionBlock,
    cleanExtractedText: exp.cleanExtractedText,
    detectSubject: exp.detectSubject,
    rawExports: exp,
    env: sandbox.process.env
  };
}

// ═══════════════════════════════════════════════════════════════
// 3. ADVERSARIAL TEST RUNNER
// ═══════════════════════════════════════════════════════════════

class AdversarialTestSuite {
  constructor(name) {
    this.name = name;
    this.results = [];
  }

  test(description, fn) {
    try {
      fn();
      this.results.push({ description, pass: true });
      console.log(`  \x1b[32m✔ [PASS]\x1b[0m ${description}`);
    } catch (err) {
      this.results.push({ description, pass: false, error: err.message });
      console.error(`  \x1b[31m✖ [FAIL]\x1b[0m ${description}\n    \x1b[33mError: ${err.message}\x1b[0m`);
    }
  }

  async asyncTest(description, fn) {
    try {
      await fn();
      this.results.push({ description, pass: true });
      console.log(`  \x1b[32m✔ [PASS]\x1b[0m ${description}`);
    } catch (err) {
      this.results.push({ description, pass: false, error: err.message });
      console.error(`  \x1b[31m✖ [FAIL]\x1b[0m ${description}\n    \x1b[33mError: ${err.message}\x1b[0m`);
    }
  }

  summary() {
    const total = this.results.length;
    const passed = this.results.filter(r => r.pass).length;
    const failed = total - passed;
    console.log(`\n═══════════════════════════════════════════════════════════════════════════`);
    console.log(`  ${this.name} Results: ${passed}/${total} passed (${failed} failed)`);
    console.log(`═══════════════════════════════════════════════════════════════════════════\n`);
    return failed === 0;
  }
}

async function runAllAdversarialChallenges() {
  const runner = new AdversarialTestSuite('Adversarial Payload & SDK Challenger Suite');

  console.log('\n' + '█'.repeat(75));
  console.log('  CHALLENGER 1: ADVERSARIAL PAYLOAD & SDK STRESS HARNESS');
  console.log('█'.repeat(75) + '\n');

  // ─────────────────────────────────────────────────────────────
  // SUITE 1: PAYLOAD EDGE CASES, BASE64 FORMATS & BINARY HANDLING
  // ─────────────────────────────────────────────────────────────
  console.log('\x1b[1m=== Suite 1: Payload Edge Cases, Base64 Formats & Binary Handling ===\x1b[0m');

  await runner.asyncTest('1.1 Empty JSON payload {} handled safely returning empty questions array', async () => {
    const mock = createMockGenAIState();
    const route = loadRouteWithMock(mock);
    const req = createMockRequest({ type: 'json', body: {} });
    const res = await route.POST(req);
    const data = await res.json();
    if (data.success !== true || !Array.isArray(data.questions) || data.questions.length !== 0) {
      throw new Error(`Expected success: true, questions: [] but got ${JSON.stringify(data)}`);
    }
    if (mock.state.generateContentCalls.length !== 0) {
      throw new Error('Gemini API was invoked for empty payload');
    }
  });

  await runner.asyncTest('1.2 Empty string pdfBase64: "" and rawText: "" handled safely', async () => {
    const mock = createMockGenAIState();
    const route = loadRouteWithMock(mock);
    const req = createMockRequest({ type: 'json', body: { pdfBase64: '', rawText: '' } });
    const res = await route.POST(req);
    const data = await res.json();
    if (data.success !== true || data.questions_count !== 0) {
      throw new Error(`Expected count 0, got: ${data.questions_count}`);
    }
  });

  await runner.asyncTest('1.3 Base64 data with data:application/pdf;base64, prefix cleanly stripped', async () => {
    const mock = createMockGenAIState();
    const route = loadRouteWithMock(mock);
    const req = createMockRequest({ type: 'json', body: { pdfBase64: DUMMY_DATA_URL_PDF } });
    const res = await route.POST(req);
    const data = await res.json();
    if (data.success !== true) throw new Error('Route failed');
    const call = mock.state.generateContentCalls[0];
    const inlineData = call.contents.find(c => c.inlineData).inlineData;
    if (inlineData.mimeType !== 'application/pdf') throw new Error(`Wrong mimeType: ${inlineData.mimeType}`);
    if (inlineData.data !== DUMMY_RAW_BASE64) throw new Error('Prefix was not stripped cleanly');
    if (inlineData.data.startsWith('data:')) throw new Error('Data still has data: prefix');
  });

  await runner.asyncTest('1.4 Base64 data with non-PDF data URL prefix (e.g. data:application/octet-stream;base64,) stripped', async () => {
    const mock = createMockGenAIState();
    const route = loadRouteWithMock(mock);
    const req = createMockRequest({ type: 'json', body: { pdfBase64: DUMMY_OCTET_DATA_URL } });
    const res = await route.POST(req);
    const data = await res.json();
    if (data.success !== true) throw new Error('Route failed');
    const call = mock.state.generateContentCalls[0];
    const inlineData = call.contents.find(c => c.inlineData).inlineData;
    if (inlineData.data !== DUMMY_RAW_BASE64) throw new Error(`Failed to strip non-standard data URL: ${inlineData.data}`);
  });

  await runner.asyncTest('1.5 Raw base64 string without data: prefix passed directly to inlineData.data', async () => {
    const mock = createMockGenAIState();
    const route = loadRouteWithMock(mock);
    const req = createMockRequest({ type: 'json', body: { pdfBase64: DUMMY_RAW_BASE64 } });
    const res = await route.POST(req);
    const data = await res.json();
    if (data.success !== true) throw new Error('Route failed');
    const call = mock.state.generateContentCalls[0];
    const inlineData = call.contents.find(c => c.inlineData).inlineData;
    if (inlineData.data !== DUMMY_RAW_BASE64) throw new Error('Raw base64 was corrupted');
  });

  await runner.asyncTest('1.6 Base64 with surrounding whitespace/newlines is trimmed before dispatch', async () => {
    const mock = createMockGenAIState();
    const route = loadRouteWithMock(mock);
    const padded = `  \n\r\t ${DUMMY_DATA_URL_PDF} \n\t  `;
    const req = createMockRequest({ type: 'json', body: { pdfBase64: padded } });
    await route.POST(req);
    const call = mock.state.generateContentCalls[0];
    const inlineData = call.contents.find(c => c.inlineData).inlineData;
    if (inlineData.data !== DUMMY_RAW_BASE64) throw new Error('Whitespace was not trimmed');
  });

  await runner.asyncTest('1.7 Multipart/FormData upload with pdfBase64 field handled correctly', async () => {
    const mock = createMockGenAIState();
    const route = loadRouteWithMock(mock);
    const formData = new Map();
    formData.set('pdfBase64', DUMMY_DATA_URL_PDF);
    formData.set('fileName', 'test_exam.pdf');
    const req = createMockRequest({ type: 'form-data', formDataMap: formData });
    const res = await route.POST(req);
    const data = await res.json();
    if (data.success !== true) throw new Error('FormData route failed');
    if (mock.state.generateContentCalls.length !== 1) throw new Error('Gemini was not called');
  });

  await runner.asyncTest('1.8 Corrupt base64 string causing Gemini API error returns status 500 JSON without crash', async () => {
    const mock = createMockGenAIState();
    mock.state.responseProvider = () => {
      const err = new Error('Invalid base64 payload received by Gemini API (INVALID_ARGUMENT)');
      err.status = 400;
      throw err;
    };
    const route = loadRouteWithMock(mock);
    const req = createMockRequest({ type: 'json', body: { pdfBase64: 'corrupt_base64_payload_here' } });
    const res = await route.POST(req);
    const data = await res.json();
    if (res.status !== 500) throw new Error(`Expected status 500, got: ${res.status}`);
    if (data.success !== false || !data.error.includes('Gemini AI PDF parsing failed')) {
      throw new Error(`Expected failure error message, got: ${JSON.stringify(data)}`);
    }
  });

  // ─────────────────────────────────────────────────────────────
  // SUITE 2: MARKDOWN FENCING, RESPONSE WRAPPERS & MALFORMED OUTPUT
  // ─────────────────────────────────────────────────────────────
  console.log('\n\x1b[1m=== Suite 2: Markdown Fencing, Response Wrappers & Malformed Output ===\x1b[0m');

  await runner.asyncTest('2.1 Markdown code fence ```json ... ``` cleanly stripped and parsed', async () => {
    const mock = createMockGenAIState();
    mock.state.responseProvider = () => ({
      text: `\`\`\`json\n${JSON.stringify(COMPLEX_STEM_GEMINI_OUTPUT)}\n\`\`\``
    });
    const route = loadRouteWithMock(mock);
    const req = createMockRequest({ type: 'json', body: { pdfBase64: DUMMY_RAW_BASE64 } });
    const res = await route.POST(req);
    const data = await res.json();
    if (data.success !== true || data.questions_count !== 5) {
      throw new Error(`Failed to parse fenced JSON: ${JSON.stringify(data)}`);
    }
  });

  await runner.asyncTest('2.2 Generic markdown code fence ``` ... ``` (without json tag) cleanly stripped', async () => {
    const mock = createMockGenAIState();
    mock.state.responseProvider = () => ({
      text: `\`\`\`\n${JSON.stringify(COMPLEX_STEM_GEMINI_OUTPUT)}\n\`\`\``
    });
    const route = loadRouteWithMock(mock);
    const req = createMockRequest({ type: 'json', body: { pdfBase64: DUMMY_RAW_BASE64 } });
    const res = await route.POST(req);
    const data = await res.json();
    if (data.success !== true || data.questions_count !== 5) {
      throw new Error(`Failed to parse generic fenced JSON: ${JSON.stringify(data)}`);
    }
  });

  await runner.asyncTest('2.3 Gemini candidate parts content extraction (when response.text is undefined)', async () => {
    const mock = createMockGenAIState();
    mock.state.responseProvider = () => ({
      text: undefined,
      candidates: [
        {
          content: {
            parts: [
              { text: JSON.stringify(COMPLEX_STEM_GEMINI_OUTPUT) }
            ]
          }
        }
      ]
    });
    const route = loadRouteWithMock(mock);
    const req = createMockRequest({ type: 'json', body: { pdfBase64: DUMMY_RAW_BASE64 } });
    const res = await route.POST(req);
    const data = await res.json();
    if (data.success !== true || data.questions_count !== 5) {
      throw new Error(`Failed to extract candidate parts: ${JSON.stringify(data)}`);
    }
  });

  await runner.asyncTest('2.4 Top-level JSON array [{...}] parsed correctly into questions', async () => {
    const mock = createMockGenAIState();
    mock.state.responseProvider = () => ({
      text: JSON.stringify(COMPLEX_STEM_GEMINI_OUTPUT.questions)
    });
    const route = loadRouteWithMock(mock);
    const req = createMockRequest({ type: 'json', body: { pdfBase64: DUMMY_RAW_BASE64 } });
    const res = await route.POST(req);
    const data = await res.json();
    if (data.success !== true || data.questions_count !== 5) {
      throw new Error(`Failed to parse array format: ${JSON.stringify(data)}`);
    }
  });

  await runner.asyncTest('2.5 JSON wrapped under { data: [...] } parsed correctly', async () => {
    const mock = createMockGenAIState();
    mock.state.responseProvider = () => ({
      text: JSON.stringify({ data: COMPLEX_STEM_GEMINI_OUTPUT.questions })
    });
    const route = loadRouteWithMock(mock);
    const req = createMockRequest({ type: 'json', body: { pdfBase64: DUMMY_RAW_BASE64 } });
    const res = await route.POST(req);
    const data = await res.json();
    if (data.success !== true || data.questions_count !== 5) {
      throw new Error(`Failed to parse { data: [] } format: ${JSON.stringify(data)}`);
    }
  });

  await runner.asyncTest('2.6 Corrupted non-JSON string from Gemini returns status 500 with parse error', async () => {
    const mock = createMockGenAIState();
    mock.state.responseProvider = () => ({
      text: 'I cannot parse this PDF because the image is blurry.'
    });
    const route = loadRouteWithMock(mock);
    const req = createMockRequest({ type: 'json', body: { pdfBase64: DUMMY_RAW_BASE64 } });
    const res = await route.POST(req);
    const data = await res.json();
    if (res.status !== 500) throw new Error(`Expected status 500, got: ${res.status}`);
    if (data.success !== false || !data.error.includes('Failed to parse Gemini JSON output')) {
      throw new Error(`Expected parse error, got: ${JSON.stringify(data)}`);
    }
  });

  // ─────────────────────────────────────────────────────────────
  // SUITE 3: STEM CONTENT FIDELITY & SCHEMAS
  // ─────────────────────────────────────────────────────────────
  console.log('\n\x1b[1m=== Suite 3: STEM Content Fidelity & Schemas ===\x1b[0m');

  await runner.asyncTest('3.1 Negative numerical answer ("-5") preserved with empty options []', async () => {
    const mock = createMockGenAIState();
    const route = loadRouteWithMock(mock);
    const req = createMockRequest({ type: 'json', body: { pdfBase64: DUMMY_RAW_BASE64 } });
    const res = await route.POST(req);
    const data = await res.json();
    const numQ = data.questions.find(q => q.formatType === 'numerical');
    if (!numQ) throw new Error('Numerical question not found');
    if (numQ.correct_answer !== '-5') throw new Error(`Negative answer mutated: ${numQ.correct_answer}`);
    if (!Array.isArray(numQ.options) || numQ.options.length !== 0) throw new Error(`Numerical options should be [], got: ${JSON.stringify(numQ.options)}`);
    if (numQ.marks.positive !== 4 || numQ.marks.negative !== 0) throw new Error(`Wrong numerical marks: ${JSON.stringify(numQ.marks)}`);
  });

  await runner.asyncTest('3.2 Complex chemistry brackets (e.g. [Ni(CN)_4]^{2-}) NOT stripped by option sanitizer', async () => {
    const mock = createMockGenAIState();
    const route = loadRouteWithMock(mock);
    const req = createMockRequest({ type: 'json', body: { pdfBase64: DUMMY_RAW_BASE64 } });
    const res = await route.POST(req);
    const data = await res.json();
    const chemQ = data.questions.find(q => q.subject === 'Chemistry');
    if (!chemQ) throw new Error('Chemistry question not found');
    if (!chemQ.options.includes('[Ni(CN)_4]^{2-}')) {
      throw new Error(`Chemical bracket was stripped from options: ${JSON.stringify(chemQ.options)}`);
    }
  });

  await runner.asyncTest('3.3 Assertion-Reasoning format preserves statements and 4 evaluation options', async () => {
    const mock = createMockGenAIState();
    const route = loadRouteWithMock(mock);
    const req = createMockRequest({ type: 'json', body: { pdfBase64: DUMMY_RAW_BASE64 } });
    const res = await route.POST(req);
    const data = await res.json();
    const arQ = data.questions.find(q => q.formatType === 'assertion_reason');
    if (!arQ) throw new Error('Assertion-reason question not found');
    if (arQ.options.length !== 4) throw new Error(`Expected 4 options, got: ${arQ.options.length}`);
    if (!arQ.content.includes('Assertion (A)') || !arQ.content.includes('Reason (R)')) {
      throw new Error(`Content missing assertion/reason stems: ${arQ.content}`);
    }
  });

  await runner.asyncTest('3.4 Matrix-Match format preserves column matching syntax and options', async () => {
    const mock = createMockGenAIState();
    const route = loadRouteWithMock(mock);
    const req = createMockRequest({ type: 'json', body: { pdfBase64: DUMMY_RAW_BASE64 } });
    const res = await route.POST(req);
    const data = await res.json();
    const matQ = data.questions.find(q => q.formatType === 'matrix_match');
    if (!matQ) throw new Error('Matrix match question not found');
    if (matQ.options.length !== 4) throw new Error(`Expected 4 options, got: ${matQ.options.length}`);
    if (!matQ.options[0].includes('->')) throw new Error(`Mapping syntax missing: ${matQ.options[0]}`);
  });

  runner.test('3.5 sanitizeGeminiQuestions pads missing options and normalizes aliases', () => {
    const mock = createMockGenAIState();
    const { sanitizeGeminiQuestions } = loadRouteWithMock(mock);
    const raw = [
      {
        question: 'What is the unit of force?',
        options: ['Newton', 'Joule'], // only 2 options!
        correct_answer: 'Newton',
        difficulty: 'invalid_diff',
        formatType: 'single'
      }
    ];
    const sanitized = sanitizeGeminiQuestions(raw);
    if (sanitized.length !== 1) throw new Error('Expected 1 question');
    const q = sanitized[0];
    if (q.formatType !== 'single_mcq') throw new Error(`formatType alias single not normalized: ${q.formatType}`);
    if (q.options.length !== 4) throw new Error(`Options not padded to 4: ${q.options.length}`);
    if (q.options[2] !== 'Option C' || q.options[3] !== 'Option D') throw new Error(`Padding wrong: ${JSON.stringify(q.options)}`);
    if (q.difficulty !== 'MEDIUM') throw new Error(`Invalid difficulty not defaulted to MEDIUM: ${q.difficulty}`);
    if (q.correct_option_index !== 0) throw new Error(`Correct option index not resolved: ${q.correct_option_index}`);
  });

  // ─────────────────────────────────────────────────────────────
  // SUITE 4: API KEY CONFIGURATIONS, FAILOVERS & ERROR RESILIENCE
  // ─────────────────────────────────────────────────────────────
  console.log('\n\x1b[1m=== Suite 4: API Key Configurations, Failovers & Error Resilience ===\x1b[0m');

  await runner.asyncTest('4.1 Missing API key with rawText seamlessly falls back to deterministic regex parser', async () => {
    const mock = createMockGenAIState();
    const route = loadRouteWithMock(mock, { GEMINI_API_KEY: '', GOOGLE_GENAI_API_KEY: '', GOOGLE_API_KEY: '' });
    const rawText = `Q.1 A solid sphere rolls down. Find acceleration.\n(A) 5/7 g sin theta\n(B) 2/3 g sin theta\n(C) 1/2 g sin theta\n(D) g sin theta\nAns: (A)\nExplanation: For solid sphere I = 2/5 MR^2.`;
    const req = createMockRequest({ type: 'json', body: { pdfBase64: DUMMY_DATA_URL_PDF, rawText } });
    const res = await route.POST(req);
    const data = await res.json();
    if (data.success !== true || data.parserType !== 'deterministic_engine') {
      throw new Error(`Failed to fall back to deterministic engine: ${JSON.stringify(data)}`);
    }
    if (data.questions_count !== 1) throw new Error(`Expected 1 parsed question, got ${data.questions_count}`);
    if (mock.state.generateContentCalls.length !== 0) throw new Error('Gemini API should not be called');
  });

  await runner.asyncTest('4.2 Missing API key without rawText returns HTTP 400 with helpful instructions', async () => {
    const mock = createMockGenAIState();
    const route = loadRouteWithMock(mock, { GEMINI_API_KEY: '', GOOGLE_GENAI_API_KEY: '', GOOGLE_API_KEY: '' });
    const req = createMockRequest({ type: 'json', body: { pdfBase64: DUMMY_DATA_URL_PDF } });
    const res = await route.POST(req);
    const data = await res.json();
    if (res.status !== 400) throw new Error(`Expected status 400, got ${res.status}`);
    if (data.success !== false || !data.error.includes('GEMINI_API_KEY is not configured')) {
      throw new Error(`Expected configuration error message, got: ${JSON.stringify(data)}`);
    }
  });

  await runner.asyncTest('4.3 Supports GOOGLE_GENAI_API_KEY environment variable fallback', async () => {
    const mock = createMockGenAIState();
    const route = loadRouteWithMock(mock, { GEMINI_API_KEY: '', GOOGLE_GENAI_API_KEY: 'test-google-genai-key-999', GOOGLE_API_KEY: '' });
    const req = createMockRequest({ type: 'json', body: { pdfBase64: DUMMY_DATA_URL_PDF } });
    const res = await route.POST(req);
    const data = await res.json();
    if (data.success !== true) throw new Error('Failed with GOOGLE_GENAI_API_KEY');
    const client = mock.state.instances[0];
    const key = client.config.apiKey || client.config;
    if (key !== 'test-google-genai-key-999') throw new Error(`Wrong key passed: ${key}`);
  });

  await runner.asyncTest('4.4 Gemini API 503 Overloaded error with rawText falls back to deterministic regex', async () => {
    const mock = createMockGenAIState();
    mock.state.responseProvider = () => {
      const err = new Error('503 The model is overloaded. Please try again later.');
      err.status = 503;
      throw err;
    };
    const route = loadRouteWithMock(mock);
    const rawText = `Q.1 Find the limit as x approaches 0 of sin(x)/x.\n(A) 1\n(B) 0\n(C) Infinity\n(D) -1\nAns: A\nSolution: Standard limit.`;
    const req = createMockRequest({ type: 'json', body: { pdfBase64: DUMMY_DATA_URL_PDF, rawText } });
    const res = await route.POST(req);
    const data = await res.json();
    if (data.success !== true || data.parserType !== 'deterministic_engine') {
      throw new Error(`Failed to fall back to deterministic parser on 503 error: ${JSON.stringify(data)}`);
    }
    if (!data.warning || !data.warning.includes('Gemini parsing failed')) {
      throw new Error(`Missing warning in fallback response: ${data.warning}`);
    }
  });

  // ─────────────────────────────────────────────────────────────
  // SUITE 5: DETERMINISTIC FALLBACK & NOISE RESISTANCE
  // ─────────────────────────────────────────────────────────────
  console.log('\n\x1b[1m=== Suite 5: Deterministic Fallback & Noise Resistance ===\x1b[0m');

  runner.test('5.1 Noise sanitization strips headers, footers, watermarks, dividers while preserving signed numbers', () => {
    const mock = createMockGenAIState();
    const { cleanExtractedText } = loadRouteWithMock(mock);
    const noisyText = `
NATIONAL TESTING AGENCY - MOCK EXAMINATION
CONFIDENTIAL - ASENTRA EDUCATION PORTAL
Page 1 of 10
-----------------------------------------
Q.1 Find the charge.
(1) -5 C
(2) +5 C
(3) 0 C
(4) -10 C
Ans: 1
=========================================
Page 2 of 10
    `;
    const cleaned = cleanExtractedText(noisyText);
    if (cleaned.includes('NATIONAL TESTING AGENCY')) throw new Error('Failed to strip NTA banner');
    if (cleaned.includes('CONFIDENTIAL')) throw new Error('Failed to strip CONFIDENTIAL');
    if (cleaned.includes('Page 1 of 10')) throw new Error('Failed to strip Page marker');
    if (cleaned.includes('-----------------------------------------')) throw new Error('Failed to strip divider');
    if (!cleaned.includes('-5 C')) throw new Error('Corrupted signed number -5 C');
  });

  runner.test('5.2 Sub-item statements (Statement I / II) inside question do not split question boundary', () => {
    const mock = createMockGenAIState();
    const { parseExtractedText } = loadRouteWithMock(mock);
    const statementQ = `
3. Given below are two statements:
Statement I: Glycolysis occurs in cytoplasm.
Statement II: Krebs cycle produces ATP.
Choose the correct option:
(A) Both Statement I and Statement II are true
(B) Both Statement I and Statement II are false
(C) Statement I is true but Statement II is false
(D) Statement I is false but Statement II is true
Ans: A
Explanation: Both statements are factual.
    `;
    const parsed = parseExtractedText(statementQ);
    if (parsed.length !== 1) throw new Error(`Expected exactly 1 question, got ${parsed.length}`);
    if (parsed[0].options.length !== 4) throw new Error(`Expected 4 options, got ${parsed[0].options.length}`);
  });

  return runner.summary();
}

// Module export & CLI support
if (require.main === module) {
  runAllAdversarialChallenges()
    .then(passed => {
      process.exit(passed ? 0 : 1);
    })
    .catch(err => {
      console.error('Fatal challenger execution error:', err);
      process.exit(1);
    });
}

module.exports = {
  runAllAdversarialChallenges
};
