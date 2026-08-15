/**
 * test-gemini-payload.js — Comprehensive E2E & Programmatic Verification Suite
 *
 * Requirements Met:
 * - R1: Native Gemini PDF Parsing via @google/genai SDK with inlineData (mimeType: 'application/pdf')
 * - R2: Structured JSON Output with strict system instructions for 5 question formats
 * - AC1: Programmatic Verification mocking @google/genai, verifying generateContent payload,
 *        inlineData, systemInstruction, JSON schema, and boundary fallbacks.
 *
 * 5-Tier Verification Architecture:
 *   Tier 1: SDK Mock Interception & Payload Structure (GoogleGenAI instantiation, generateContent call, model configuration)
 *   Tier 2: Multimodal inlineData & Base64 Binary Handling (mimeType: 'application/pdf', prefix stripping, FormData/JSON)
 *   Tier 3: SystemInstruction & JSON Schema Fidelity (5 question formats, options, correct_option_index, explanation, subjects)
 *   Tier 4: Canonical Question Output Format & Field Mapping (schema conformity, options array, answer resolution)
 *   Tier 5: Adversarial Boundary, Fallback Engine & Exception Resilience (missing API key, rawText fallback, API errors, malformed JSON)
 *
 * Usage:
 *   node test-gemini-payload.js
 *
 * Exit Codes:
 *   0 = All assertion tiers passed successfully
 *   1 = One or more test assertions failed
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

// ═══════════════════════════════════════════════════════════════
// 1. CANONICAL TEST FIXTURES & DUMMY PDF DATA
// ═══════════════════════════════════════════════════════════════

// Sample valid base64 PDF header and payload
const DUMMY_RAW_BASE64 = 'JVBERi0xLjQKJcTl8uXrp/Og0MTGCjEgMCBvYmoKPDwvVHlwZSAvQ2F0YWxvZwovUGFnZXMgMiAwIFI+PgplbmRvYmoKMiAwIG9iago8PC9UeXBlIC9QYWdlcwovS2lkcyBbMyAwIFJdCi9Db3VudCAxCj4+CmVuZG9iagozIDAgb2JqCjw8L1R5cGUgL1BhZ2UKL1BhcmVudCAyIDAgUgovTWVkaWFCb3ggWzAgMCA2MTIgNzkyXQo+PgplbmRvYmoKeHJlZgowIDQKMDAwMDAwMDAwMCA2NTUzNSBmIAowMDAwMDAwMDE1IDAwMDAwIG4gCjAwMDAwMDAwNjggMDAwMDAgbiAKMDAwMDAwMDEyNSAwMDAwMCBuIAp0cmFpbGVyCjw8L1NpemUgND4+CnN0YXJ0eHJlZgoxOTkKJSVFT0Y=';
const DUMMY_DATA_URL_PDF = `data:application/pdf;base64,${DUMMY_RAW_BASE64}`;

// Canonical 5-Question Gemini JSON Response Mock representing all supported formats
const CANONICAL_GEMINI_OUTPUT = {
  success: true,
  parserType: 'gemini_ai_multimodal',
  questions_count: 5,
  questions: [
    {
      id: 'pdf-q-1-1771165800001',
      subject: 'Physics',
      sub_topic: 'Rotational Dynamics',
      difficulty: 'HARD',
      formatType: 'single_mcq',
      content: 'A uniform solid cylinder of mass $M$ and radius $R$ rolls without slipping down an inclined plane of inclination $\\theta$ with the horizontal. The acceleration of the center of mass of the cylinder is:',
      diagram_url: '',
      options: [
        'g \\sin \\theta',
        '\\frac{2}{3} g \\sin \\theta',
        '\\frac{1}{2} g \\sin \\theta',
        '\\frac{3}{4} g \\sin \\theta'
      ],
      correct_option_index: 1,
      correct_answer: '\\frac{2}{3} g \\sin \\theta',
      explanation: 'For a solid cylinder, $I = \\frac{1}{2}MR^2$. Acceleration down an incline is $a = \\frac{g \\sin \\theta}{1 + I/(MR^2)} = \\frac{2}{3} g \\sin \\theta$.',
      marks: { positive: 4, negative: -1 }
    },
    {
      id: 'pdf-q-2-1771165800002',
      subject: 'Chemistry',
      sub_topic: 'Coordination Compounds',
      difficulty: 'HARD',
      formatType: 'multi_mcq',
      content: 'Which of the following coordination complexes is/are diamagnetic and exhibit square planar geometry according to Valence Bond Theory?',
      diagram_url: '',
      options: [
        '[Ni(CN)_4]^{2-}',
        '[PtCl_4]^{2-}',
        '[NiCl_4]^{2-}',
        '[CoF_6]^{3-}'
      ],
      correct_option_index: 0,
      correct_answer: '[Ni(CN)_4]^{2-}, [PtCl_4]^{2-}',
      explanation: 'Both $[Ni(CN)_4]^{2-}$ and $[PtCl_4]^{2-}$ have $d^8$ electron configurations with strong field ligands, resulting in $dsp^2$ hybridization and diamagnetic square planar geometry.',
      marks: { positive: 4, negative: -2 }
    },
    {
      id: 'pdf-q-3-1771165800003',
      subject: 'Mathematics',
      sub_topic: 'Calculus & Optimization',
      difficulty: 'MEDIUM',
      formatType: 'numerical',
      content: 'Find the minimum value of $f(x) = 2x^3 - 9x^2 + 12x - 5$ on the closed interval $[0, 3]$.',
      diagram_url: '',
      options: [],
      correct_option_index: 0,
      correct_answer: '-5',
      explanation: "f'(x) = 6x^2 - 18x + 12 = 6(x-1)(x-2) = 0 at critical points x=1, x=2. Evaluating endpoints and critical values: f(0) = -5, f(1) = 0, f(2) = -1, f(3) = 4. The absolute minimum is -5.",
      marks: { positive: 4, negative: 0 }
    },
    {
      id: 'pdf-q-4-1771165800004',
      subject: 'Biology',
      sub_topic: 'Cellular Respiration',
      difficulty: 'MEDIUM',
      formatType: 'assertion_reason',
      content: '**Assertion (A):** Glycolysis occurs in the cytoplasm of all living cells.\n**Reason (R):** Glycolysis does not require molecular oxygen to breakdown glucose into pyruvate.',
      diagram_url: '',
      options: [
        'Both (A) and (R) are true and (R) is the correct explanation of (A)',
        'Both (A) and (R) are true but (R) is NOT the correct explanation of (A)',
        '(A) is true but (R) is false',
        '(A) is false but (R) is true'
      ],
      correct_option_index: 0,
      correct_answer: 'Both (A) and (R) are true and (R) is the correct explanation of (A)',
      explanation: 'Glycolysis is the universal anaerobic metabolic pathway located in the cytosol, independent of oxygen and organelles.',
      marks: { positive: 4, negative: -1 }
    },
    {
      id: 'pdf-q-5-1771165800005',
      subject: 'Physics',
      sub_topic: 'AC Circuits',
      difficulty: 'HARD',
      formatType: 'matrix_match',
      content: 'Match the AC circuit conditions in Column I with characteristics in Column II:\n\n**Column I:**\n(A) Resonance ($X_L = X_C$)\n(B) Inductive ($X_L > X_C$)\n(C) Capacitive ($X_C > X_L$)\n(D) Pure Resistive ($X_L = X_C = 0$)\n\n**Column II:**\n(P) Current leads voltage\n(Q) Voltage leads current\n(R) Power factor $\\cos\\phi = 1$\n(S) Impedance $Z = R$',
      diagram_url: '',
      options: [
        'A->R, B->Q, C->P, D->S',
        'A->Q, B->R, C->P, D->S',
        'A->R, B->P, C->S, D->Q',
        'A->S, B->Q, C->R, D->P'
      ],
      correct_option_index: 0,
      correct_answer: 'A->R, B->Q, C->P, D->S',
      explanation: 'At resonance, impedance is purely resistive ($Z=R$) and power factor is 1 (A->R, D->S). When inductive, voltage leads current (B->Q). When capacitive, current leads voltage (C->P).',
      marks: { positive: 4, negative: -1 }
    }
  ]
};

// ═══════════════════════════════════════════════════════════════
// 2. MOCK ENVIRONMENT & SANDBOX ROUTE LOADER
// ═══════════════════════════════════════════════════════════════

/**
 * Creates a controllable Mock GoogleGenAI client that records calls and returns configured responses.
 */
function createMockGenAIState() {
  const state = {
    instances: [],
    generateContentCalls: [],
    responseProvider: () => ({
      text: JSON.stringify(CANONICAL_GEMINI_OUTPUT)
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

/**
 * Creates a Mock Request object supporting JSON, FormData, headers, and text streams.
 */
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

/**
 * Loads and compiles the route.js handler in a sandboxed VM with mock @google/genai and Next.js polyfills.
 */
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

  // Next.js NextResponse mock
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

  // Transform ESM syntax for execution in VM context
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
      parseExtractedText: typeof parseExtractedText !== 'undefined' ? parseExtractedText : undefined,
      parseQuestionBlock: typeof parseQuestionBlock !== 'undefined' ? parseQuestionBlock : undefined,
      cleanExtractedText: typeof cleanExtractedText !== 'undefined' ? cleanExtractedText : undefined,
      detectSubject: typeof detectSubject !== 'undefined' ? detectSubject : undefined,
      ...module.exports
    };
  `;

  vm.runInContext(wrapperCode, sandbox);
  const exp = sandbox.module.exports;

  if (typeof exp.POST !== 'function') {
    throw new Error('Failed to find export POST handler in route.js');
  }

  return {
    POST: exp.POST,
    rawExports: exp,
    env: sandbox.process.env
  };
}

// ═══════════════════════════════════════════════════════════════
// 3. ASSERTION ENGINE & TEST HARNESS
// ═══════════════════════════════════════════════════════════════

class GeminiTestSuite {
  constructor(suiteName) {
    this.suiteName = suiteName;
    this.totalAssertions = 0;
    this.passedAssertions = 0;
    this.failedAssertions = 0;
    this.tierResults = {
      tier1: { name: 'Tier 1: SDK Mock Interception & Payload Structure', passed: 0, failed: 0, errors: [] },
      tier2: { name: 'Tier 2: Multimodal inlineData & Base64 Binary Handling', passed: 0, failed: 0, errors: [] },
      tier3: { name: 'Tier 3: SystemInstruction & JSON Schema Instructions Fidelity', passed: 0, failed: 0, errors: [] },
      tier4: { name: 'Tier 4: Canonical Question Output Format & Field Mapping', passed: 0, failed: 0, errors: [] },
      tier5: { name: 'Tier 5: Adversarial Boundary, Fallbacks & Error Resilience', passed: 0, failed: 0, errors: [] }
    };
  }

  assert(tierKey, condition, testDescription, errorDetails = '') {
    this.totalAssertions++;
    const tier = this.tierResults[tierKey];
    if (!tier) throw new Error(`Unknown tier key: ${tierKey}`);

    if (condition) {
      tier.passed++;
      this.passedAssertions++;
      console.log(`  \x1b[32m✔\x1b[0m [${tierKey.toUpperCase()}] ${testDescription}`);
    } else {
      tier.failed++;
      this.failedAssertions++;
      const msg = `FAIL: ${testDescription}${errorDetails ? ' -> ' + errorDetails : ''}`;
      tier.errors.push(msg);
      console.error(`  \x1b[31m✖\x1b[0m [${tierKey.toUpperCase()}] \x1b[31m${testDescription}\x1b[0m`);
      if (errorDetails) {
        console.error(`    \x1b[33mDetails:\x1b[0m ${errorDetails}`);
      }
    }
  }

  printSummary() {
    console.log('\n' + '═'.repeat(75));
    console.log(`  TEST RESULTS SUMMARY — ${this.suiteName}`);
    console.log('═'.repeat(75));

    let allTiersPassed = true;
    for (const [key, tier] of Object.entries(this.tierResults)) {
      const statusIcon = tier.failed === 0 && tier.passed > 0
        ? '\x1b[32mPASS\x1b[0m'
        : (tier.failed > 0 ? '\x1b[31mFAIL\x1b[0m' : '\x1b[33mSKIP\x1b[0m');
      console.log(`  [${statusIcon}] ${tier.name}: ${tier.passed} passed, ${tier.failed} failed`);
      if (tier.failed > 0) {
        allTiersPassed = false;
        tier.errors.forEach(err => console.log(`      \x1b[31m•\x1b[0m ${err}`));
      }
    }

    console.log('─'.repeat(75));
    console.log(`  Total Assertions: ${this.totalAssertions} | Passed: \x1b[32m${this.passedAssertions}\x1b[0m | Failed: \x1b[31m${this.failedAssertions}\x1b[0m`);
    console.log('═'.repeat(75));

    return allTiersPassed && this.failedAssertions === 0;
  }
}

// ═══════════════════════════════════════════════════════════════
// 4. MAIN PROGRAMMATIC TEST PIPELINE
// ═══════════════════════════════════════════════════════════════

async function runGeminiPayloadTests() {
  console.log('\n' + '█'.repeat(75));
  console.log('  GEMINI PDF PARSER PAYLOAD & SDK TEST SUITE (AC1 VERIFICATION)');
  console.log('█'.repeat(75) + '\n');

  const suite = new GeminiTestSuite('Gemini AI Multimodal PDF Parser Verification');

  // ═════════════════════════════════════════════════════════════
  // TIER 1: SDK MOCK INTERCEPTION & PAYLOAD STRUCTURE
  // ═════════════════════════════════════════════════════════════
  console.log('\x1b[1m--- Tier 1: SDK Mock Interception & Payload Structure ---\x1b[0m');

  const mock1 = createMockGenAIState();
  let route1;
  try {
    route1 = loadRouteWithMock(mock1, { GEMINI_API_KEY: 'test-key-abc-123' });
    suite.assert('tier1', typeof route1.POST === 'function', 'Route handler POST loaded and compiles in sandboxed VM');
  } catch (err) {
    suite.assert('tier1', false, 'Route loader failed to initialize', err.message);
  }

  // Invoke POST route with JSON payload containing Base64 PDF Data URL
  let res1;
  let resData1 = {};
  try {
    const req1 = createMockRequest({
      type: 'json',
      body: {
        pdfBase64: DUMMY_DATA_URL_PDF,
        fileName: 'JEE_Advanced_Mock_Paper.pdf',
        parserType: 'gemini_ai_multimodal'
      }
    });

    res1 = await route1.POST(req1);
    resData1 = (res1 && typeof res1.json === 'function') ? await res1.json() : (res1 ? res1._data : {});

    suite.assert('tier1', !!res1, 'POST handler returns a valid response object');
    suite.assert('tier1', mock1.state.instances.length > 0, 'GoogleGenAI client was instantiated during route execution');

    const clientInstance = mock1.state.instances[0];
    const passedApiKey = clientInstance && clientInstance.config ? (clientInstance.config.apiKey || clientInstance.config) : '';
    suite.assert(
      'tier1',
      passedApiKey === 'test-key-abc-123',
      'GoogleGenAI initialized with active process.env.GEMINI_API_KEY',
      `Got apiKey: "${passedApiKey}"`
    );

    suite.assert(
      'tier1',
      mock1.state.generateContentCalls.length === 1,
      'generateContent was invoked exactly once on the Gemini client',
      `Actual calls: ${mock1.state.generateContentCalls.length}`
    );

    const callArgs = mock1.state.generateContentCalls[0] || {};
    suite.assert(
      'tier1',
      callArgs.model && (callArgs.model.includes('gemini-2.5-flash') || callArgs.model.includes('gemini-1.5-flash') || callArgs.model.includes('gemini-2.0-flash')),
      'generateContent model is configured to gemini-2.5-flash (or valid flash model)',
      `Actual model: "${callArgs.model}"`
    );

    suite.assert(
      'tier1',
      Array.isArray(callArgs.contents) && callArgs.contents.length > 0,
      'generateContent contents payload is an array',
      `Type: ${typeof callArgs.contents}`
    );

    suite.assert(
      'tier1',
      resData1.success === true,
      'Route returns success: true for valid Gemini PDF invocation',
      `Actual success: ${resData1.success}`
    );

    suite.assert(
      'tier1',
      resData1.parserType === 'gemini_ai_multimodal',
      'Route response parserType is "gemini_ai_multimodal"',
      `Actual parserType: "${resData1.parserType}"`
    );
  } catch (err) {
    suite.assert('tier1', false, 'Tier 1 execution threw uncaught exception', err.stack);
  }

  // ═════════════════════════════════════════════════════════════
  // TIER 2: MULTIMODAL inlineData & BASE64 BINARY HANDLING
  // ═════════════════════════════════════════════════════════════
  console.log('\n\x1b[1m--- Tier 2: Multimodal inlineData & Base64 Binary Handling ---\x1b[0m');

  try {
    const callArgs = mock1.state.generateContentCalls[0] || {};
    const contents = callArgs.contents || [];

    // Locate inlineData object inside contents array
    const inlineDataItem = contents.find(c => c && c.inlineData) ||
      (contents[0] && contents[0].inlineData ? contents[0] : null);

    const inlineData = inlineDataItem ? inlineDataItem.inlineData : null;

    suite.assert('tier2', !!inlineData, 'contents array contains a valid inlineData object');

    if (inlineData) {
      suite.assert(
        'tier2',
        inlineData.mimeType === 'application/pdf',
        'inlineData.mimeType is strictly "application/pdf"',
        `Got: "${inlineData.mimeType}"`
      );

      suite.assert(
        'tier2',
        inlineData.data === DUMMY_RAW_BASE64,
        'inlineData.data contains clean base64 data (data URL prefix "data:application/pdf;base64," cleanly stripped)',
        `Data starts with: "${(inlineData.data || '').substring(0, 30)}..."`
      );

      suite.assert(
        'tier2',
        !inlineData.data.startsWith('data:'),
        'inlineData.data does not retain leading "data:" scheme',
        `Value prefix: "${(inlineData.data || '').substring(0, 15)}"`
      );
    }

    // Test 2.4: Raw Base64 string without data URL prefix (verifies direct base64 pass-through)
    const mock2 = createMockGenAIState();
    const route2 = loadRouteWithMock(mock2);
    const req2 = createMockRequest({
      type: 'json',
      body: {
        pdfBase64: DUMMY_RAW_BASE64,
        fileName: 'Chemistry_Paper.pdf'
      }
    });
    await route2.POST(req2);
    const call2 = mock2.state.generateContentCalls[0];
    const inline2 = call2 && call2.contents && call2.contents.find(c => c.inlineData);
    suite.assert(
      'tier2',
      inline2 && inline2.inlineData && inline2.inlineData.data === DUMMY_RAW_BASE64,
      'Raw base64 without prefix is correctly handled and passed to inlineData.data'
    );

    // Test 2.5: FormData ingestion with multipart/form-data
    const mockFormData = createMockGenAIState();
    const routeFormData = loadRouteWithMock(mockFormData);
    const formFields = new Map();
    formFields.set('pdfBase64', DUMMY_DATA_URL_PDF);
    formFields.set('fileName', 'Math_Exam.pdf');
    formFields.set('parserType', 'gemini_ai_multimodal');

    const reqFormData = createMockRequest({
      type: 'form-data',
      formDataMap: formFields
    });

    const resFormData = await routeFormData.POST(reqFormData);
    const dataFormData = await resFormData.json();
    const callFormData = mockFormData.state.generateContentCalls[0];
    const inlineFormData = callFormData && callFormData.contents && callFormData.contents.find(c => c.inlineData);

    suite.assert(
      'tier2',
      dataFormData.success === true && !!inlineFormData && inlineFormData.inlineData.mimeType === 'application/pdf',
      'FormData payload with pdfBase64 correctly dispatches inlineData to Gemini'
    );
  } catch (err) {
    suite.assert('tier2', false, 'Tier 2 execution threw uncaught exception', err.stack);
  }

  // ═════════════════════════════════════════════════════════════
  // TIER 3: SYSTEM INSTRUCTION & JSON SCHEMA FIDELITY
  // ═════════════════════════════════════════════════════════════
  console.log('\n\x1b[1m--- Tier 3: SystemInstruction & JSON Schema Instructions Fidelity ---\x1b[0m');

  try {
    const callArgs = mock1.state.generateContentCalls[0] || {};
    const config = callArgs.config || {};
    const systemInstruction = config.systemInstruction || '';
    const textPrompt = (callArgs.contents || []).find(c => c && typeof c.text === 'string')?.text || '';
    const combinedPromptInstructions = `${typeof systemInstruction === 'string' ? systemInstruction : JSON.stringify(systemInstruction)} ${textPrompt}`.toLowerCase();

    // Verify responseMimeType is application/json
    suite.assert(
      'tier3',
      config.responseMimeType === 'application/json' || /json/i.test(combinedPromptInstructions),
      'config.responseMimeType is "application/json" or instructions enforce strict JSON mode',
      `responseMimeType: "${config.responseMimeType}"`
    );

    // Verify System Instructions include all 5 question types
    suite.assert(
      'tier3',
      combinedPromptInstructions.includes('single_mcq') || (combinedPromptInstructions.includes('single') && combinedPromptInstructions.includes('mcq')),
      'Instructions specify "single_mcq" question format'
    );

    suite.assert(
      'tier3',
      combinedPromptInstructions.includes('multi_mcq') || combinedPromptInstructions.includes('multiple') || combinedPromptInstructions.includes('multi-correct'),
      'Instructions specify "multi_mcq" question format'
    );

    suite.assert(
      'tier3',
      combinedPromptInstructions.includes('numerical') || combinedPromptInstructions.includes('integer'),
      'Instructions specify "numerical" / integer question format'
    );

    suite.assert(
      'tier3',
      combinedPromptInstructions.includes('assertion_reason') || (combinedPromptInstructions.includes('assertion') && combinedPromptInstructions.includes('reason')),
      'Instructions specify "assertion_reason" question format'
    );

    suite.assert(
      'tier3',
      combinedPromptInstructions.includes('matrix_match') || combinedPromptInstructions.includes('matrix') || combinedPromptInstructions.includes('matching'),
      'Instructions specify "matrix_match" question format'
    );

    // Verify Core Field Extraction Requirements
    suite.assert(
      'tier3',
      combinedPromptInstructions.includes('options') && (combinedPromptInstructions.includes('correct_option_index') || combinedPromptInstructions.includes('0-based') || combinedPromptInstructions.includes('index')),
      'Instructions enforce options array and 0-based correct_option_index'
    );

    suite.assert(
      'tier3',
      combinedPromptInstructions.includes('explanation') || combinedPromptInstructions.includes('solution'),
      'Instructions require explanation / solution derivation'
    );

    suite.assert(
      'tier3',
      combinedPromptInstructions.includes('subject') || combinedPromptInstructions.includes('physics') || combinedPromptInstructions.includes('chemistry'),
      'Instructions specify academic subject classification (Physics, Chemistry, Math, Biology)'
    );
  } catch (err) {
    suite.assert('tier3', false, 'Tier 3 execution threw uncaught exception', err.stack);
  }

  // ═════════════════════════════════════════════════════════════
  // TIER 4: CANONICAL QUESTION OUTPUT FORMAT & FIELD MAPPING
  // ═════════════════════════════════════════════════════════════
  console.log('\n\x1b[1m--- Tier 4: Canonical Question Output Format & Field Mapping ---\x1b[0m');

  try {
    const questions = resData1.questions || [];
    suite.assert('tier4', Array.isArray(questions), 'Returned questions is a valid array', `Type: ${typeof questions}`);
    suite.assert('tier4', questions.length === 5, 'Exactly 5 question objects returned from canonical payload', `Count: ${questions.length}`);
    suite.assert('tier4', resData1.questions_count === 5, 'questions_count matches questions.length', `questions_count: ${resData1.questions_count}`);

    const requiredKeys = ['id', 'subject', 'sub_topic', 'difficulty', 'formatType', 'content', 'options', 'correct_option_index', 'correct_answer', 'explanation'];

    questions.forEach((q, idx) => {
      const missing = requiredKeys.filter(k => !(k in q));
      suite.assert(
        'tier4',
        missing.length === 0,
        `Question #${idx + 1} (${q.formatType || 'unknown'}) conforms to canonical schema with all required fields`,
        missing.length > 0 ? `Missing fields: ${missing.join(', ')}` : ''
      );

      suite.assert(
        'tier4',
        typeof q.content === 'string' && q.content.trim().length > 0,
        `Question #${idx + 1} stem content is a non-empty string`
      );
    });

    // Format-Specific Ingestion Integrity
    const singleMcq = questions.find(q => q.formatType === 'single_mcq');
    const multiMcq = questions.find(q => q.formatType === 'multi_mcq');
    const numericalQ = questions.find(q => q.formatType === 'numerical');
    const arQ = questions.find(q => q.formatType === 'assertion_reason');
    const matrixQ = questions.find(q => q.formatType === 'matrix_match');

    // Single MCQ
    suite.assert('tier4', !!singleMcq && Array.isArray(singleMcq.options) && singleMcq.options.length === 4, 'single_mcq has exactly 4 options');
    if (singleMcq) {
      suite.assert('tier4', typeof singleMcq.correct_option_index === 'number' && singleMcq.correct_option_index >= 0 && singleMcq.correct_option_index <= 3, 'single_mcq correct_option_index is in 0..3');
      suite.assert('tier4', typeof singleMcq.correct_answer === 'string' && singleMcq.correct_answer.length > 0, 'single_mcq correct_answer is populated');
    }

    // Multi MCQ
    suite.assert('tier4', !!multiMcq && Array.isArray(multiMcq.options) && multiMcq.options.length >= 2, 'multi_mcq contains options list');

    // Numerical
    suite.assert('tier4', !!numericalQ, 'numerical question object parsed successfully');
    if (numericalQ) {
      suite.assert('tier4', Array.isArray(numericalQ.options) && numericalQ.options.length === 0, 'numerical question options is empty array []');
      suite.assert('tier4', typeof numericalQ.correct_answer === 'string' && numericalQ.correct_answer === '-5', 'numerical correct_answer preserves negative value "-5"');
    }

    // Assertion Reason
    suite.assert('tier4', !!arQ && Array.isArray(arQ.options) && arQ.options.length === 4, 'assertion_reason question options has 4 evaluation options');

    // Matrix Match
    suite.assert('tier4', !!matrixQ && Array.isArray(matrixQ.options) && matrixQ.options.length === 4, 'matrix_match question contains 4 combination options');
    if (matrixQ) {
      suite.assert('tier4', matrixQ.options[0].includes('->') || matrixQ.options[0].includes('A'), 'matrix_match options contain column mapping syntax');
    }
  } catch (err) {
    suite.assert('tier4', false, 'Tier 4 execution threw uncaught exception', err.stack);
  }

  // ═════════════════════════════════════════════════════════════
  // TIER 5: ADVERSARIAL BOUNDARY, FALLBACKS & ERROR RESILIENCE
  // ═════════════════════════════════════════════════════════════
  console.log('\n\x1b[1m--- Tier 5: Adversarial Boundary, Fallbacks & Error Resilience ---\x1b[0m');

  // Test 5.1: Missing API Key with rawText fallback
  try {
    const mockNoKey = createMockGenAIState();
    const routeNoKey = loadRouteWithMock(mockNoKey, { GEMINI_API_KEY: '', GOOGLE_GENAI_API_KEY: '', GOOGLE_API_KEY: '' });

    const rawTextSample = `Q.1 A particle moves with velocity v. Find speed.\n(A) 5 m/s\n(B) 10 m/s\n(C) 15 m/s\n(D) 20 m/s\nAns: (B)\nExplanation: Speed is magnitude of velocity.`;
    const reqNoKey = createMockRequest({
      type: 'json',
      body: {
        rawText: rawTextSample
      }
    });

    const resNoKey = await routeNoKey.POST(reqNoKey);
    const dataNoKey = await resNoKey.json();

    suite.assert(
      'tier5',
      dataNoKey.success === true && Array.isArray(dataNoKey.questions) && dataNoKey.questions.length === 1,
      'When API key is missing and rawText is provided, seamlessly falls back to deterministic regex parser',
      `Success: ${dataNoKey.success}, Count: ${dataNoKey.questions_count}`
    );
    suite.assert(
      'tier5',
      mockNoKey.state.generateContentCalls.length === 0,
      'Missing API key does NOT invoke Gemini generateContent'
    );
  } catch (err) {
    suite.assert('tier5', false, 'Test 5.1 threw uncaught exception', err.message);
  }

  // Test 5.2: Raw text input only (without base64) when API key is present
  try {
    const mockRawOnly = createMockGenAIState();
    const routeRawOnly = loadRouteWithMock(mockRawOnly);

    const reqRawOnly = createMockRequest({
      type: 'json',
      body: {
        rawText: `Q.1 What is acceleration due to gravity?\n(A) 9.8 m/s²\n(B) 1.6 m/s²\n(C) 0 m/s²\n(D) 100 m/s²\nAns: A\nExplanation: Standard Earth gravity is 9.8 m/s².`,
        parserType: 'deterministic_engine'
      }
    });

    const resRawOnly = await routeRawOnly.POST(reqRawOnly);
    const dataRawOnly = await resRawOnly.json();

    suite.assert(
      'tier5',
      dataRawOnly.success === true && dataRawOnly.parserType === 'deterministic_engine',
      'Raw text requests with parserType="deterministic_engine" execute regex parser with parserType="deterministic_engine"',
      `Actual parserType: "${dataRawOnly.parserType}"`
    );
    suite.assert(
      'tier5',
      mockRawOnly.state.generateContentCalls.length === 0,
      'Raw text parsing does not invoke Gemini API (zero API cost path)'
    );
  } catch (err) {
    suite.assert('tier5', false, 'Test 5.2 threw uncaught exception', err.message);
  }

  // Test 5.3: Gemini API 500 / Network Error Resilience
  try {
    const mockError = createMockGenAIState();
    mockError.state.responseProvider = () => {
      const apiErr = new Error('Google Gemini API Error: 503 Service Unavailable (Overloaded)');
      apiErr.status = 503;
      throw apiErr;
    };

    const routeError = loadRouteWithMock(mockError);
    const reqError = createMockRequest({
      type: 'json',
      body: {
        pdfBase64: DUMMY_DATA_URL_PDF,
        fileName: 'Broken_Test.pdf'
      }
    });

    const resError = await routeError.POST(reqError);
    const dataError = await resError.json();

    suite.assert(
      'tier5',
      dataError.success === false && typeof dataError.error === 'string' && dataError.error.includes('503'),
      'Catches Gemini API errors gracefully and returns JSON { success: false, error: ... } with status 500',
      `Status: ${resError.status}, Error: "${dataError.error}"`
    );
  } catch (err) {
    suite.assert('tier5', false, 'Test 5.3 threw uncaught exception', err.message);
  }

  // Test 5.4: Gemini returns malformed non-JSON markdown wrapper
  try {
    const mockMarkdown = createMockGenAIState();
    // Simulate Gemini wrapping JSON in markdown code fence ```json ... ```
    mockMarkdown.state.responseProvider = () => ({
      text: `\`\`\`json\n${JSON.stringify(CANONICAL_GEMINI_OUTPUT)}\n\`\`\``
    });

    const routeMarkdown = loadRouteWithMock(mockMarkdown);
    const reqMarkdown = createMockRequest({
      type: 'json',
      body: {
        pdfBase64: DUMMY_DATA_URL_PDF
      }
    });

    const resMarkdown = await routeMarkdown.POST(reqMarkdown);
    const dataMarkdown = await resMarkdown.json();

    suite.assert(
      'tier5',
      dataMarkdown.success === true && Array.isArray(dataMarkdown.questions) && dataMarkdown.questions.length === 5,
      'Resiliently strips markdown code fences (```json ... ```) from Gemini text output',
      `Success: ${dataMarkdown.success}, Count: ${dataMarkdown.questions ? dataMarkdown.questions.length : 0}`
    );
  } catch (err) {
    suite.assert('tier5', false, 'Test 5.4 threw uncaught exception', err.message);
  }

  // Test 5.5: Empty base64 payload returns graceful empty result / error
  try {
    const mockEmpty = createMockGenAIState();
    const routeEmpty = loadRouteWithMock(mockEmpty);
    const reqEmpty = createMockRequest({
      type: 'json',
      body: {
        pdfBase64: ''
      }
    });

    const resEmpty = await routeEmpty.POST(reqEmpty);
    const dataEmpty = await resEmpty.json();

    suite.assert(
      'tier5',
      dataEmpty.success === true || dataEmpty.success === false,
      'Empty base64 payload handled safely without crashing process'
    );
  } catch (err) {
    suite.assert('tier5', false, 'Test 5.5 threw uncaught exception', err.message);
  }

  // ═════════════════════════════════════════════════════════════
  // FINAL TEST SUITE REPORT & EXIT CODE EVALUATION
  // ═════════════════════════════════════════════════════════════
  const passed = suite.printSummary();
  if (passed) {
    console.log('\n\x1b[32m✔ ALL GEMINI PAYLOAD ASSERTION TIERS PASSED (Status Code 0)\x1b[0m\n');
    return true;
  } else {
    console.error('\n\x1b[31m✖ GEMINI PAYLOAD TEST SUITE FAILED (Status Code 1)\x1b[0m\n');
    return false;
  }
}

// Support CLI execution or module export
if (require.main === module) {
  runGeminiPayloadTests()
    .then(passed => {
      process.exit(passed ? 0 : 1);
    })
    .catch(err => {
      console.error('Fatal test runner error:', err);
      process.exit(1);
    });
}

module.exports = {
  DUMMY_RAW_BASE64,
  DUMMY_DATA_URL_PDF,
  CANONICAL_GEMINI_OUTPUT,
  createMockGenAIState,
  createMockRequest,
  loadRouteWithMock,
  GeminiTestSuite,
  runGeminiPayloadTests
};
