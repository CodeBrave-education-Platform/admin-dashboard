/**
 * tests/e2e/fixtures/mockData.js
 * 
 * Authoritative Mock Data Fixtures for Admin Dashboard E2E Test Suite
 * Covers Test Packages, Courses, Exams, Attempts, Invoices, Profiles, and Adversarial Edge Cases.
 */

const MOCK_TEST_PACKAGES = [
  {
    id: 'pkg-01-jee-main-super60',
    title: 'JEE Main 2026 Super 60 All India Test Series',
    target_exam_tag: 'JEE Main',
    description: 'Comprehensive high-yield mock tests curated by Kota senior faculty with detailed proctored telemetry.',
    thumbnail_url: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=800&auto=format&fit=crop&q=60',
    is_active: true,
    total_tests_count: 60,
    test_distribution: {
      chapter_drills: 30,
      full_mocks: 20,
      live_papers: 10
    },
    price_ledger: {
      status: 'premium',
      price: 1999,
      original_price: 3999
    },
    enrolled_count: 2450,
    created_at: '2026-01-10T10:00:00Z',
    test_exams: [
      { id: 'exam-01', title: 'JEE Main Mock 01 (Physics & Chem)', duration_minutes: 180, total_questions: 90, marks_scheme: { positive_marks: 4, negative: -1 } },
      { id: 'exam-02', title: 'JEE Main Mock 02 (Full Syllabus)', duration_minutes: 180, total_questions: 90, marks_scheme: { positive: 4, negative: -1 } }
    ]
  },
  {
    id: 'pkg-02-jee-advanced-elite',
    title: 'JEE Advanced Rankers Challenge Test Series',
    target_exam_tag: 'JEE Advanced',
    description: 'Multi-correct and matrix match rigorous tests designed for top 500 AIR aspirants.',
    thumbnail_url: 'https://images.unsplash.com/photo-1513258496099-48168024aec0?w=800&auto=format&fit=crop&q=60',
    is_active: true,
    total_tests_count: 45,
    test_distribution: {
      chapter_drills: 20,
      full_mocks: 15,
      live_papers: 10
    },
    price_ledger: {
      status: 'premium',
      price: 2999,
      original_price: 5999
    },
    enrolled_count: 1280,
    created_at: '2026-02-01T12:00:00Z',
    test_exams: [
      { id: 'exam-03', title: 'Adv Paper 1 - Physics/Maths Intensive', duration_minutes: 180, total_questions: 54, marks_scheme: { positive_marks: 4, negative: -2 } }
    ]
  },
  {
    id: 'pkg-03-neet-medical-mastery',
    title: 'NEET UG 2026 Precision 100 Test Series',
    target_exam_tag: 'NEET',
    description: 'NCERT line-by-line targeted biology, organic chemistry, and high-yield physics drills.',
    thumbnail_url: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800&auto=format&fit=crop&q=60',
    is_active: false,
    total_tests_count: 100,
    test_distribution: {
      chapter_drills: 60,
      full_mocks: 30,
      live_papers: 10
    },
    price_ledger: {
      status: 'premium',
      price: 1499,
      original_price: 2999
    },
    enrolled_count: 3120,
    created_at: '2026-01-15T09:00:00Z',
    test_exams: []
  },
  {
    id: 'pkg-04-foundation-olympiad',
    title: 'Class 10 Foundation & NTSE/NSEJS Starter Pack',
    target_exam_tag: 'Foundation',
    description: 'Build robust fundamentals in STEM subjects with beginner-to-advanced diagnostic tests.',
    thumbnail_url: null, // Test fallback gradient
    is_active: true,
    total_tests_count: 25,
    test_distribution: {
      chapter_drills: 15,
      full_mocks: 8,
      live_papers: 2
    },
    price_ledger: {
      status: 'free',
      price: 0,
      original_price: null
    },
    enrolled_count: 5400,
    created_at: '2026-03-01T08:30:00Z',
    test_exams: []
  },
  {
    id: 'pkg-05-kvpy-scholar-drill',
    title: 'KVPY & National Science Olympiad Grand Drills',
    target_exam_tag: 'KVPY',
    description: 'Deep conceptual problem sets focusing on analytical thinking and proof techniques.',
    thumbnail_url: 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=800&auto=format&fit=crop&q=60',
    is_active: true,
    total_tests_count: 30,
    test_distribution: {
      chapter_drills: 15,
      full_mocks: 10,
      live_papers: 5
    },
    price_ledger: {
      status: 'premium',
      price: 999,
      original_price: 1999
    },
    enrolled_count: 890,
    created_at: '2026-02-20T14:15:00Z',
    test_exams: []
  }
];

const MOCK_COURSES = [
  {
    id: 'crs-01-physics-mechanics-pro',
    title: 'Advanced Mechanics & Rotational Dynamics Masterclass',
    description: 'Rigorous deep dive into Newtonian mechanics, rigid body dynamics, and Lagrangian formulation.',
    subject: 'Physics',
    level: 'JEE Advanced',
    instructor_name: 'Dr. Vikram Malhotra (IIT Bombay)',
    thumbnail_url: 'https://images.unsplash.com/photo-1636466497217-26a8cbeaf0aa?w=800&auto=format&fit=crop&q=60',
    price: 3499,
    original_price: 5999,
    badge: 'Bestseller',
    book_kit: 'Mechanics Hardcover Problem Book + Solution Manual',
    students_count: 1420,
    is_active: true,
    created_at: '2026-01-05T11:00:00Z',
    lessons_count: 48,
    files_count: 24,
    exams_count: 12,
    lessons: new Array(48).fill({ id: 'les-dummy' }),
    course_files: new Array(24).fill({ id: 'file-dummy' }),
    assessments: new Array(12).fill({ id: 'ass-dummy' })
  },
  {
    id: 'crs-02-organic-chemistry-elite',
    title: 'Organic Reaction Mechanisms & Stereochemistry Blueprint',
    description: 'Master nucleophilic additions, pericyclic reactions, and retro-synthetic synthesis pathways.',
    subject: 'Chemistry',
    level: 'JEE Advanced',
    instructor_name: 'Prof. Ananya Sen (IISc)',
    thumbnail_url: 'https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?w=800&auto=format&fit=crop&q=60',
    price: 2999,
    original_price: 4999,
    badge: 'Top Rated',
    book_kit: 'Organic Mechanisms Flashcards & Pocket Guide',
    students_count: 1850,
    is_active: true,
    created_at: '2026-01-12T14:30:00Z',
    lessons_count: 36,
    files_count: 18,
    exams_count: 8,
    lessons: new Array(36).fill({ id: 'les-dummy' }),
    course_files: new Array(18).fill({ id: 'file-dummy' }),
    assessments: new Array(8).fill({ id: 'ass-dummy' })
  },
  {
    id: 'crs-03-calculus-integral-mastery',
    title: 'Calculus, Differential Equations & Analysis for Top 100 AIR',
    description: 'Comprehensive calculus syllabus covering limits, mean value theorems, and multivariable basics.',
    subject: 'Mathematics',
    level: 'JEE Main',
    instructor_name: 'Ramanathan Iyer (IIT Madras)',
    thumbnail_url: null, // Test subject fallback gradient
    price: 1999,
    original_price: 3499,
    badge: null,
    book_kit: null,
    students_count: 2100,
    is_active: true,
    created_at: '2026-01-20T16:00:00Z',
    lessons_count: 52,
    files_count: 30,
    exams_count: 15,
    lessons: new Array(52).fill({ id: 'les-dummy' }),
    course_files: new Array(30).fill({ id: 'file-dummy' }),
    assessments: new Array(15).fill({ id: 'ass-dummy' })
  },
  {
    id: 'crs-04-neet-biology-complete',
    title: 'NEET Human Physiology, Genetics & Ecology 360/360',
    description: 'High scoring visual 3D animated course with 5,000+ NCERT assertion-reason drill questions.',
    subject: 'Biology',
    level: 'NEET',
    instructor_name: 'Dr. Priya Nambiar (AIIMS Delhi)',
    thumbnail_url: 'https://images.unsplash.com/photo-1530497610245-94d3c16cda28?w=800&auto=format&fit=crop&q=60',
    price: 2499,
    original_price: 4499,
    badge: 'Popular',
    book_kit: 'Printed Colored Atlas & Diagram Workbook',
    students_count: 4890,
    is_active: false,
    created_at: '2026-02-05T10:00:00Z',
    lessons_count: 70,
    files_count: 45,
    exams_count: 20,
    lessons: new Array(70).fill({ id: 'les-dummy' }),
    course_files: new Array(45).fill({ id: 'file-dummy' }),
    assessments: new Array(20).fill({ id: 'ass-dummy' })
  },
  {
    id: 'crs-05-foundation-stem-starter',
    title: 'STEM Discovery & Scientific Olympiad Primer (Grade 9 & 10)',
    description: 'Interactive experimental science and computational mathematics for junior scholars.',
    subject: 'General',
    level: 'Foundation',
    instructor_name: 'Asentra Youth Faculty',
    thumbnail_url: null,
    price: 0,
    original_price: 1499,
    badge: 'Free Tier',
    book_kit: null,
    students_count: 6500,
    is_active: true,
    created_at: '2026-02-15T09:00:00Z',
    lessons_count: 20,
    files_count: 10,
    exams_count: 5,
    lessons: new Array(20).fill({ id: 'les-dummy' }),
    course_files: new Array(10).fill({ id: 'file-dummy' }),
    assessments: new Array(5).fill({ id: 'ass-dummy' })
  }
];

const MOCK_ATTEMPTS = [
  {
    id: 'att-01',
    exam_id: 'exam-01',
    score: 280,
    total_duration_seconds: 9800,
    correct_count: 72,
    incorrect_count: 8,
    unattempted_count: 10,
    completed_at: '2026-08-19T10:00:00Z',
    profiles: {
      full_name: 'Aditya Sharma',
      email: 'aditya.sharma@example.com'
    },
    test_exams: {
      total_questions: 90,
      marks_scheme: { positive_marks: 4, negative: -1 }
    }
  },
  {
    id: 'att-02',
    exam_id: 'exam-01',
    score: 210,
    total_duration_seconds: 10400,
    correct_count: 56,
    incorrect_count: 14,
    unattempted_count: 20,
    completed_at: '2026-08-19T11:15:00Z',
    profiles: {
      full_name: null,
      email: 'rohit_verma_kota@student.in'
    },
    test_exams: {
      total_questions: 90,
      marks_scheme: { positive_marks: 4, negative: -1 }
    }
  },
  {
    id: 'att-03',
    exam_id: 'exam-01',
    score: 340,
    total_duration_seconds: 8900,
    correct_count: 86,
    incorrect_count: 4,
    unattempted_count: 0,
    completed_at: '2026-08-19T12:00:00Z',
    profiles: {
      full_name: null,
      email: null // Test optional chaining in MonitorClient
    },
    test_exams: {
      total_questions: 90,
      marks_scheme: { positive_marks: 4, negative: -1 }
    }
  },
  {
    id: 'att-04',
    exam_id: 'exam-02',
    score: 180,
    total_duration_seconds: 7200,
    correct_count: 48,
    incorrect_count: 12,
    unattempted_count: 30,
    completed_at: '2026-08-19T13:00:00Z',
    profiles: {
      full_name: 'Sneha Patel',
      email: 'sneha.patel@gmail.com'
    },
    test_exams: {
      total_questions: 90,
      marks_scheme: { positive: 4, negative: -1 } // Uses "positive" instead of "positive_marks"
    }
  },
  {
    id: 'att-05',
    exam_id: 'exam-02',
    score: 75,
    total_duration_seconds: 4500,
    correct_count: 22,
    incorrect_count: 13,
    unattempted_count: 55,
    completed_at: '2026-08-19T14:00:00Z',
    profiles: null, // Completely null profiles relation
    test_exams: {
      total_questions: 90,
      marks_scheme: null // Missing marks_scheme (default fallback 4)
    }
  }
];

const MOCK_INVOICES = [
  { id: 'inv-01', package_id: 'pkg-01-jee-main-super60', course_id: null, amount_paid: 1999, status: 'captured' },
  { id: 'inv-02', package_id: 'pkg-01-jee-main-super60', course_id: null, amount_paid: 1999, status: 'captured' },
  { id: 'inv-03', package_id: 'pkg-02-jee-advanced-elite', course_id: null, amount_paid: 2999, status: 'captured' },
  { id: 'inv-04', package_id: null, course_id: 'crs-01-physics-mechanics-pro', amount_paid: 3499, status: 'captured' },
  { id: 'inv-05', package_id: null, course_id: 'crs-02-organic-chemistry-elite', amount_paid: 2999, status: 'captured' }
];

const MOCK_CORNER_CASES = {
  emptyPackageList: [],
  emptyCourseList: [],
  malformedPackage: {
    id: 'pkg-corrupted',
    title: null,
    target_exam_tag: undefined,
    price_ledger: null,
    test_distribution: null,
    thumbnail_url: '',
    is_active: null
  },
  maliciousSearchStrings: [
    '<script>alert("xss")</script>',
    "'; DROP TABLE test_packages; --",
    '{{7*7}}',
    '${process.env.SUPABASE_SERVICE_ROLE_KEY}',
    '\\x00\\x1f\\x7f'
  ],
  extremePricePackage: {
    id: 'pkg-extreme-price',
    title: 'Ultra High Value Masterclass Package',
    price_ledger: { status: 'premium', price: 99999999, original_price: 199999999 }
  },
  longTitleCourse: {
    id: 'crs-long-title',
    title: 'A'.repeat(500),
    description: 'B'.repeat(2000),
    subject: 'Physics',
    level: 'JEE Advanced'
  }
};

module.exports = {
  MOCK_TEST_PACKAGES,
  MOCK_COURSES,
  MOCK_ATTEMPTS,
  MOCK_INVOICES,
  MOCK_CORNER_CASES
};
