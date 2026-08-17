/**
 * mockData.js
 * Comprehensive mock data fixtures for Batches and Test Series test suites.
 */

// ═══════════════════════════════════════════════════════════════
// BATCHES FIXTURES
// ═══════════════════════════════════════════════════════════════

const MOCK_BATCHES_BASE = [
  {
    id: 'batch-01-alpha-jee',
    title: 'JEE 2027 Alpha Rankers Cohort',
    description: 'Intensive 2-year integrated classroom program for JEE Advanced & Mains aspirants.',
    start_date: '2026-09-01T09:00:00Z',
    price: 4999,
    status: 'published',
    stream: 'JEE',
    target_focus: 'JEE',
    students_count: 145,
    materials_count: 28,
    live_sessions_count: 12,
    exams_count: 8,
    created_at: '2026-01-10T10:00:00Z',
    deleted_at: null
  },
  {
    id: 'batch-02-neet-elite',
    title: 'NEET 2026 Elite Medical Masterclass',
    description: 'Complete NCERT-focused Biology, Chemistry, and Physics drill cohort for NEET UG.',
    start_date: '2026-08-25T10:00:00Z',
    price: 3999,
    status: 'published',
    stream: 'NEET',
    target_focus: 'NEET',
    students_count: 210,
    materials_count: 42,
    live_sessions_count: 18,
    exams_count: 15,
    created_at: '2026-01-15T12:00:00Z',
    deleted_at: null
  },
  {
    id: 'batch-03-foundation-stem',
    title: 'Foundation Olympiad & STEM Grade 10',
    description: 'Strengthening mathematical foundations, physics concepts, and Olympiad problem solving.',
    start_date: '2026-10-01T08:00:00Z',
    price: 0, // Free cohort
    status: 'published',
    stream: 'Foundation',
    target_focus: 'Foundation',
    students_count: 380,
    materials_count: 15,
    live_sessions_count: 6,
    exams_count: 4,
    created_at: '2026-01-20T14:00:00Z',
    deleted_at: null
  },
  {
    id: 'batch-04-jee-crash-draft',
    title: 'JEE Main 2026 Rapid Crash Course (Phase 2)',
    description: '60-day high-yield question marathon and live doubt clearing sessions.',
    start_date: '2026-11-15T16:00:00Z',
    price: 1999,
    status: 'draft',
    stream: 'JEE',
    target_focus: 'JEE',
    students_count: 0,
    materials_count: 4,
    live_sessions_count: 0,
    exams_count: 2,
    created_at: '2026-02-01T08:00:00Z',
    deleted_at: null
  },
  {
    id: 'batch-05-neet-droppers-archived',
    title: 'NEET Droppers Intensive Batch 2025 (Archived)',
    description: 'Archived cohort from previous academic session.',
    start_date: '2025-06-01T09:00:00Z',
    price: 3499,
    status: 'archived',
    stream: 'NEET',
    target_focus: 'NEET',
    students_count: 98,
    materials_count: 35,
    live_sessions_count: 24,
    exams_count: 12,
    created_at: '2025-05-10T10:00:00Z',
    deleted_at: '2026-01-01T00:00:00Z'
  }
];

// Generator for large batches dataset for pagination / performance testing
function generateLargeBatchesDataset(count = 50) {
  const streams = ['JEE', 'NEET', 'Foundation', 'General'];
  const statuses = ['published', 'draft', 'archived'];
  const dataset = [];

  for (let i = 1; i <= count; i++) {
    const stream = streams[i % streams.length];
    const status = statuses[i % statuses.length];
    const price = (i % 5 === 0) ? 0 : 999 + (i * 100);
    const students = (i % 4 === 0) ? 0 : 25 + (i * 7);

    dataset.push({
      id: `gen-batch-${String(i).padStart(3, '0')}`,
      title: `${stream} Cohort Batch #${String(i).padStart(3, '0')} - Advanced Program`,
      description: `Comprehensive academic curriculum for ${stream} students targeting top ranks. Batch item index ${i}.`,
      start_date: new Date(Date.now() + i * 86400000).toISOString(),
      price,
      status,
      stream,
      target_focus: stream,
      students_count: students,
      materials_count: 5 + (i % 15),
      live_sessions_count: (i % 8),
      exams_count: 2 + (i % 6),
      created_at: new Date(Date.now() - (count - i) * 3600000).toISOString(),
      deleted_at: null
    });
  }

  return dataset;
}

// ═══════════════════════════════════════════════════════════════
// TEST SERIES FIXTURES
// ═══════════════════════════════════════════════════════════════

const MOCK_PACKAGES_BASE = [
  {
    id: 'pkg-01-jee-main-mocks',
    title: 'JEE Main 2026 All India Mock Test Series (NTA Pattern)',
    target_exam_tag: 'JEE Main',
    description: '25 Full-Length CBT Mock Tests with detailed video solutions and NTA percentile rank predictor.',
    thumbnail_url: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=400',
    total_tests_count: 25,
    test_distribution: {
      chapter_drills: 10,
      full_mocks: 12,
      live_papers: 3
    },
    price_ledger: {
      status: 'premium',
      price: 1499,
      original_price: 2999
    },
    created_at: '2026-01-05T10:00:00Z',
    test_exams: [
      {
        id: 'exam-01-mock-1',
        package_id: 'pkg-01-jee-main-mocks',
        title: 'JEE Main Full Test #01',
        duration_minutes: 180,
        total_questions: 90,
        marks_scheme: { positive_marks: 4, negative_marks: -1 },
        is_live_ranking: true,
        activation_timestamp: '2026-09-10T09:00:00Z',
        created_at: '2026-01-06T10:00:00Z'
      },
      {
        id: 'exam-02-mock-2',
        package_id: 'pkg-01-jee-main-mocks',
        title: 'JEE Main Full Test #02',
        duration_minutes: 180,
        total_questions: 90,
        marks_scheme: { positive_marks: 4, negative_marks: -1 },
        is_live_ranking: true,
        activation_timestamp: '2026-09-17T09:00:00Z',
        created_at: '2026-01-06T11:00:00Z'
      }
    ]
  },
  {
    id: 'pkg-02-jee-adv-grandmaster',
    title: 'JEE Advanced Grandmaster Mock Series 2026',
    target_exam_tag: 'JEE Advanced',
    description: 'Multi-correct, matrix match, and integer type high-rigor problem sets curated by top rankers.',
    thumbnail_url: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=400',
    total_tests_count: 18,
    test_distribution: {
      chapter_drills: 8,
      full_mocks: 8,
      live_papers: 2
    },
    price_ledger: {
      status: 'premium',
      price: 2499,
      original_price: 3999
    },
    created_at: '2026-01-12T14:00:00Z',
    test_exams: [
      {
        id: 'exam-03-adv-paper1',
        package_id: 'pkg-02-jee-adv-grandmaster',
        title: 'JEE Advanced Paper 1 (Physics, Chem, Math)',
        duration_minutes: 180,
        total_questions: 54,
        marks_scheme: { positive_marks: 4, negative_marks: -2 },
        is_live_ranking: true,
        activation_timestamp: '2026-09-20T09:00:00Z',
        created_at: '2026-01-13T10:00:00Z'
      }
    ]
  },
  {
    id: 'pkg-03-neet-biology-drills',
    title: 'NEET 2026 Rapid Chapter-wise Topic Tests (Free Starter)',
    target_exam_tag: 'NEET',
    description: 'Daily 45-minute drills for Botany, Zoology, Organic Chemistry, and Mechanics.',
    thumbnail_url: '',
    total_tests_count: 40,
    test_distribution: {
      chapter_drills: 35,
      full_mocks: 5,
      live_papers: 0
    },
    price_ledger: {
      status: 'free',
      price: 0,
      original_price: null
    },
    created_at: '2026-01-18T08:00:00Z',
    test_exams: []
  },
  {
    id: 'pkg-04-foundation-diagnostic',
    title: 'Class 10 Foundation Diagnostic & Olympiad Series',
    target_exam_tag: 'Foundation',
    description: 'NSEJS, NTSE and Regional Math Olympiad mock assessment tests.',
    thumbnail_url: '',
    total_tests_count: 10,
    test_distribution: {
      chapter_drills: 6,
      full_mocks: 4,
      live_papers: 0
    },
    price_ledger: {
      status: 'free',
      price: 0,
      original_price: 999
    },
    created_at: '2026-02-05T12:00:00Z',
    test_exams: []
  }
];

function generateLargePackagesDataset(count = 50) {
  const tags = ['JEE Main', 'JEE Advanced', 'NEET', 'Foundation', 'KVPY'];
  const dataset = [];

  for (let i = 1; i <= count; i++) {
    const tag = tags[i % tags.length];
    const isFree = (i % 3 === 0);
    const price = isFree ? 0 : 499 + (i * 50);

    dataset.push({
      id: `gen-pkg-${String(i).padStart(3, '0')}`,
      title: `${tag} High Yield Test Package #${String(i).padStart(3, '0')}`,
      target_exam_tag: tag,
      description: `Targeted CBT mock series for ${tag} preparation. Item ${i}.`,
      thumbnail_url: '',
      total_tests_count: 5 + (i % 20),
      test_distribution: {
        chapter_drills: 5 + (i % 10),
        full_mocks: 2 + (i % 8),
        live_papers: (i % 3)
      },
      price_ledger: {
        status: isFree ? 'free' : 'premium',
        price,
        original_price: isFree ? null : price + 500
      },
      created_at: new Date(Date.now() - (count - i) * 7200000).toISOString(),
      test_exams: []
    });
  }

  return dataset;
}

// ═══════════════════════════════════════════════════════════════
// ADVERSARIAL & BOUNDARY FIXTURES
// ═══════════════════════════════════════════════════════════════

const ADVERSARIAL_PAYLOADS = {
  xssTitle: '<script>alert("XSS Attack!");</script> <img src=x onerror=console.error("Injected")>',
  sqlInjectionDesc: `'; DROP TABLE batches; DROP TABLE test_packages; SELECT * FROM users WHERE '1'='1`,
  katexMathTitle: 'JEE Advanced Quantum Mechanics: $\\psi(x,t) = Ae^{i(kx-\\omega t)}$ & $\\int_{-\\infty}^{\\infty} |\\psi|^2 dx = 1$',
  unicodeEmojiTitle: '🔥 2027 Super-30 Alpha Batch 🚀 🇮🇳 ⚡ (Physics + Chemistry + Math)',
  veryLongTitle: 'A'.repeat(600), // 600 characters
  veryLongDescription: 'B'.repeat(12000), // 12,000 characters
  specialCharQuery: '!@#$%^&*()_+-=[]{}|;:",.<>?/`~\\',
  zeroPriceBatch: {
    id: 'batch-zero-cost',
    title: 'Free Public Open Seminar Cohort',
    price: 0,
    status: 'published',
    stream: 'General',
    target_focus: 'General',
    students_count: 1200,
    materials_count: 10,
    live_sessions_count: 2,
    exams_count: 1,
    created_at: '2026-01-01T00:00:00Z'
  },
  zeroStudentCohort: {
    id: 'batch-zero-students',
    title: 'Brand New Cohort (0 Enrollments)',
    price: 1999,
    status: 'draft',
    stream: 'JEE',
    target_focus: 'JEE',
    students_count: 0,
    materials_count: 0,
    live_sessions_count: 0,
    exams_count: 0,
    created_at: '2026-02-01T00:00:00Z'
  },
  missingFkEnrollment: {
    id: 'enrollment-orphan',
    user_id: 'non-existent-user-uuid-9999',
    batch_id: 'batch-01-alpha-jee',
    profiles: null // Missing FK relation
  },
  missingExamPackage: {
    id: 'exam-orphan',
    package_id: 'non-existent-package-uuid-8888',
    title: 'Orphan Exam Blueprint',
    duration_minutes: 180,
    total_questions: 90,
    questions: []
  }
};

// ═══════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════

module.exports = {
  MOCK_BATCHES_BASE,
  generateLargeBatchesDataset,
  MOCK_PACKAGES_BASE,
  generateLargePackagesDataset,
  ADVERSARIAL_PAYLOADS
};
