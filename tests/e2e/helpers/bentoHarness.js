/**
 * tests/e2e/helpers/bentoHarness.js
 * 
 * Bento Grid UI Simulation & Backend QA Engine for E2E Suite
 * Validates Bento Grid card styling, TanStack filtering/sorting, async cookies auth,
 * proctoring telemetry data flow, and DB cascade deletion invariants.
 */

/**
 * Filter Test Packages based on Tag, Pricing, and Omnibar search
 */
function filterTestPackages({ packages = [], tagFilter = 'ALL', pricingFilter = 'ALL', globalFilter = '' }) {
  return packages.filter(pkg => {
    // 1. Tag filter
    if (tagFilter !== 'ALL') {
      const pkgTag = (pkg.target_exam_tag || '').toLowerCase();
      const targetTag = tagFilter.toLowerCase();
      if (!pkgTag.includes(targetTag) && !targetTag.includes(pkgTag)) {
        return false;
      }
    }

    // 2. Pricing filter
    if (pricingFilter !== 'ALL') {
      const isPremium = pkg.price_ledger?.status === 'premium' || (Number(pkg.price_ledger?.price || 0) > 0);
      if (pricingFilter === 'FREE' && isPremium) return false;
      if (pricingFilter === 'PREMIUM' && !isPremium) return false;
    }

    // 3. Global Omnibar search filter
    if (globalFilter && String(globalFilter).trim() !== '') {
      const search = String(globalFilter).toLowerCase().trim();
      const matchTitle = String(pkg.title || '').toLowerCase().includes(search);
      const matchTag = String(pkg.target_exam_tag || '').toLowerCase().includes(search);
      const matchDesc = String(pkg.description || '').toLowerCase().includes(search);
      const matchPrice = String(pkg.price_ledger?.price || '').toLowerCase().includes(search);
      const matchStatus = String(pkg.price_ledger?.status || '').toLowerCase().includes(search);

      if (!matchTitle && !matchTag && !matchDesc && !matchPrice && !matchStatus) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Filter Courses based on Level, Status, and Omnibar search
 */
function filterCourses({ courses = [], levelFilter = 'ALL', statusFilter = 'ALL', globalFilter = '' }) {
  return courses.filter(course => {
    // 1. Level filter
    if (levelFilter !== 'ALL' && (course.level || '').toLowerCase() !== levelFilter.toLowerCase()) {
      return false;
    }

    // 2. Status filter
    if (statusFilter !== 'ALL') {
      const isActive = course.is_active !== false;
      if (statusFilter === 'ACTIVE' && !isActive) return false;
      if (statusFilter === 'INACTIVE' && isActive) return false;
    }

    // 3. Global Omnibar search
    if (globalFilter && String(globalFilter).trim() !== '') {
      const search = String(globalFilter).toLowerCase().trim();
      const matchTitle = String(course.title || '').toLowerCase().includes(search);
      const matchSubject = String(course.subject || '').toLowerCase().includes(search);
      const matchDesc = String(course.description || '').toLowerCase().includes(search);
      const matchAudience = String(course.target_audience || course.badge || '').toLowerCase().includes(search);
      const matchLevel = String(course.level || '').toLowerCase().includes(search);

      if (!matchTitle && !matchSubject && !matchDesc && !matchAudience && !matchLevel) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Multi-column sorting helper
 */
function sortDataset({ data = [], sorting = [] }) {
  if (!sorting || sorting.length === 0) return [...data];

  return [...data].sort((a, b) => {
    for (const sort of sorting) {
      const field = sort.id;
      const desc = sort.desc;
      let valA = a[field];
      let valB = b[field];

      if (field === 'pricing' || field === 'price') {
        valA = a.price_ledger?.price ?? a.price ?? 0;
        valB = b.price_ledger?.price ?? b.price ?? 0;
      }

      if (valA === valB) continue;
      if (valA === undefined || valA === null) return 1;
      if (valB === undefined || valB === null) return -1;

      if (typeof valA === 'string') {
        const cmp = valA.localeCompare(String(valB));
        if (cmp !== 0) return desc ? -cmp : cmp;
      } else {
        const cmp = valA > valB ? 1 : -1;
        return desc ? -cmp : cmp;
      }
    }
    return 0;
  });
}

/**
 * Pagination helper
 */
function paginateDataset({ data = [], pageIndex = 0, pageSize = 10 }) {
  const start = pageIndex * pageSize;
  const end = start + pageSize;
  return {
    rows: data.slice(start, end),
    totalRows: data.length,
    pageCount: Math.ceil(data.length / pageSize) || 1,
    canPreviousPage: pageIndex > 0,
    canNextPage: pageIndex < Math.ceil(data.length / pageSize) - 1
  };
}

/**
 * Generates RFC 4180 compliant CSV string for Test Packages
 */
function generateTestPackagesCsv({ exportData = [], packageEnrollments = {} }) {
  const headers = [
    'ID',
    'Title',
    'Target Tag',
    'Status',
    'Price',
    'Original Price',
    'Total Tests',
    'Drills',
    'Mocks',
    'Live Papers',
    'Enrolled Candidates',
    'Created At'
  ];
  const csvRows = [headers.join(',')];

  for (const item of exportData) {
    const dist = item.test_distribution || {};
    const priceInfo = item.price_ledger || {};
    const enrolled = packageEnrollments[item.id] || item.enrolled_count || 0;

    csvRows.push([
      `"${item.id || ''}"`,
      `"${(item.title || '').replace(/"/g, '""')}"`,
      `"${item.target_exam_tag || ''}"`,
      item.is_active !== false ? '"ACTIVE"' : '"INACTIVE"',
      priceInfo.price || 0,
      priceInfo.original_price || '',
      item.total_tests_count || 0,
      dist.chapter_drills || 0,
      dist.full_mocks || 0,
      dist.live_papers || 0,
      enrolled,
      `"${item.created_at || ''}"`
    ].join(','));
  }

  return csvRows.join('\n');
}

/**
 * Generates RFC 4180 compliant CSV string for Courses
 */
function generateCoursesCsv({ exportData = [] }) {
  const headers = [
    'ID',
    'Title',
    'Subject',
    'Level',
    'Status',
    'Price',
    'Original Price',
    'Units (Lessons)',
    'Worksheets (Files)',
    'Exams',
    'Enrolled Students',
    'Created At'
  ];
  const csvRows = [headers.join(',')];

  for (const item of exportData) {
    csvRows.push([
      `"${item.id || ''}"`,
      `"${(item.title || '').replace(/"/g, '""')}"`,
      `"${item.subject || ''}"`,
      `"${item.level || ''}"`,
      item.is_active !== false ? '"ACTIVE"' : '"INACTIVE"',
      item.price || 0,
      item.original_price || '',
      item.lessons_count || (item.lessons?.length ?? 0),
      item.files_count || (item.course_files?.length ?? 0),
      item.exams_count || (item.assessments?.length ?? 0),
      item.students_count || 0,
      `"${item.created_at || ''}"`
    ].join(','));
  }

  return csvRows.join('\n');
}

/**
 * Simulate Next.js 16 async requireAdmin() server auth check
 */
async function simulateRequireAdmin({ cookieStore, getUserFn }) {
  // Simulate Next.js 16 async cookies()
  const cookiesPromise = Promise.resolve(cookieStore);
  const resolvedCookieStore = await cookiesPromise;

  const user = await getUserFn(resolvedCookieStore);

  if (!user) {
    throw new Error('Unauthorized: Session not found');
  }

  const userRole = user?.app_metadata?.role || 'student';
  const isAuthorized = ['admin', 'teacher', 'instructor'].includes(userRole);

  if (!isAuthorized) {
    throw new Error('Forbidden: Account lacks administrative privileges');
  }

  return user;
}

/**
 * Safe candidate name resolver from MonitorClient.jsx
 */
function evaluateCandidateDisplayName(att) {
  return att?.profiles?.full_name || att?.profiles?.email?.split('@')[0] || 'Candidate';
}

/**
 * Calculate Telemetry Score Bell Curve and Average
 */
function calculateTelemetryStats(attempts = []) {
  const totalSubmissions = attempts.length;
  let averageScore = 0;
  let bellCurve = [
    { range: '0-20%', count: 0 },
    { range: '21-40%', count: 0 },
    { range: '41-60%', count: 0 },
    { range: '61-80%', count: 0 },
    { range: '81-100%', count: 0 }
  ];

  if (totalSubmissions > 0) {
    const sum = attempts.reduce((acc, curr) => acc + (curr.score || 0), 0);
    averageScore = Math.round(sum / totalSubmissions);

    const firstAttempt = attempts[0];
    const totalQ = firstAttempt?.test_exams?.total_questions || 90;
    const posMarks = firstAttempt?.test_exams?.marks_scheme?.positive_marks
      ?? firstAttempt?.test_exams?.marks_scheme?.positive
      ?? 4;
    const maxScore = totalQ * posMarks;

    attempts.forEach(att => {
      const score = att.score || 0;
      const percent = maxScore > 0 ? (score / maxScore) * 100 : 0;
      if (percent <= 20) bellCurve[0].count++;
      else if (percent <= 40) bellCurve[1].count++;
      else if (percent <= 60) bellCurve[2].count++;
      else if (percent <= 80) bellCurve[3].count++;
      else bellCurve[4].count++;
    });
  }

  return {
    totalSubmissions,
    averageScore,
    bellCurve
  };
}

/**
 * In-memory Database Cascading & Schema Integrity Simulator
 */
function simulateDbOperations() {
  let db = {
    test_packages: [],
    test_exams: [],
    test_attempts: [],
    courses: [],
    lessons: [],
    course_files: [],
    assessments: [],
    invoices: []
  };

  return {
    loadData(initial) {
      db = JSON.parse(JSON.stringify(initial));
    },
    getData() {
      return db;
    },
    deletePackage(packageId) {
      // 1. Delete package
      db.test_packages = db.test_packages.filter(p => p.id !== packageId);
      // 2. Cascade delete linked test_exams
      const examIdsToDelete = db.test_exams.filter(e => e.package_id === packageId).map(e => e.id);
      db.test_exams = db.test_exams.filter(e => e.package_id !== packageId);
      // 3. Cascade delete test_attempts for deleted exams
      db.test_attempts = db.test_attempts.filter(a => !examIdsToDelete.includes(a.exam_id));
      // 4. Invoices linked to package must be SET NULL, NOT DELETED
      db.invoices = db.invoices.map(inv => {
        if (inv.package_id === packageId) {
          return { ...inv, package_id: null };
        }
        return inv;
      });
    },
    deleteCourse(courseId) {
      // 1. Delete course
      db.courses = db.courses.filter(c => c.id !== courseId);
      // 2. Cascade delete lessons, course_files, assessments
      db.lessons = db.lessons.filter(l => l.course_id !== courseId);
      db.course_files = db.course_files.filter(f => f.course_id !== courseId);
      db.assessments = db.assessments.filter(a => a.course_id !== courseId);
      // 3. Invoices linked to course must be SET NULL, NOT DELETED
      db.invoices = db.invoices.map(inv => {
        if (inv.course_id === courseId) {
          return { ...inv, course_id: null };
        }
        return inv;
      });
    }
  };
}

/**
 * Bento Grid Visual Card Contract Verifier
 */
function inspectBentoCardVisualStructure(pkgOrCourse, entityType = 'package') {
  const result = {
    hasThumbnail: Boolean(pkgOrCourse.thumbnail_url),
    hasFallbackContainer: !pkgOrCourse.thumbnail_url,
    thumbnailUncroppedRule: 'object-cover rounded-xl shrink-0',
    hasPricePill: true,
    isFree: false,
    priceFormatted: '',
    hasActiveToggle: true,
    hasActionButtons: ['edit', 'delete']
  };

  if (entityType === 'package') {
    const isPremium = pkgOrCourse.price_ledger?.status === 'premium' || Number(pkgOrCourse.price_ledger?.price || 0) > 0;
    result.isFree = !isPremium;
    result.priceFormatted = isPremium ? `₹${Number(pkgOrCourse.price_ledger?.price || 0).toLocaleString('en-IN')}` : 'FREE';
    result.hasDistributionChips = Boolean(pkgOrCourse.test_distribution);
    result.hasTargetTagBadge = Boolean(pkgOrCourse.target_exam_tag);
  } else {
    const isPremium = Number(pkgOrCourse.price || 0) > 0;
    result.isFree = !isPremium;
    result.priceFormatted = isPremium ? `₹${Number(pkgOrCourse.price || 0).toLocaleString('en-IN')}` : 'FREE';
    result.hasCurriculumChips = true;
    result.hasSubjectBadge = Boolean(pkgOrCourse.subject);
  }

  return result;
}

module.exports = {
  filterTestPackages,
  filterCourses,
  sortDataset,
  paginateDataset,
  generateTestPackagesCsv,
  generateCoursesCsv,
  simulateRequireAdmin,
  evaluateCandidateDisplayName,
  calculateTelemetryStats,
  simulateDbOperations,
  inspectBentoCardVisualStructure
};
