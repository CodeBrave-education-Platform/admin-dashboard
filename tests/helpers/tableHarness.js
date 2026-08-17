/**
 * tableHarness.js
 * Test harness for TanStack Table v9 / Legacy API operations,
 * omnibar search, filter pills, multi-column sorting, pagination,
 * row selection, and RFC4180 CSV export generation.
 */

// ═══════════════════════════════════════════════════════════════
// CSV EXPORT GENERATOR (RFC4180 COMPLIANT)
// ═══════════════════════════════════════════════════════════════

function generateRfc4180Csv(rows, columns) {
  if (!rows || rows.length === 0) return '';
  
  // Extract headers
  const headers = columns.map(col => col.header || col.id);
  
  const escapeCell = (val) => {
    if (val === null || val === undefined) return '';
    const str = String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const headerLine = headers.map(escapeCell).join(',');
  const rowLines = rows.map(row => {
    return columns.map(col => {
      let val;
      if (typeof col.accessor === 'function') {
        val = col.accessor(row);
      } else if (col.accessorKey) {
        val = row[col.accessorKey];
      } else {
        val = row[col.id];
      }
      return escapeCell(val);
    }).join(',');
  });

  return [headerLine, ...rowLines].join('\r\n');
}

// ═══════════════════════════════════════════════════════════════
// BATCHES FILTER & SEARCH LOGIC
// ═══════════════════════════════════════════════════════════════

function filterBatches({ batches, globalFilter = '', streamFilter = 'ALL', statusFilter = 'ALL' }) {
  if (!Array.isArray(batches)) return [];

  return batches.filter(batch => {
    // 1. Stream filter
    if (streamFilter !== 'ALL') {
      const stream = (batch.stream || batch.target_focus || '').toLowerCase();
      const target = streamFilter.toLowerCase();
      if (!stream.includes(target) && !target.includes(stream)) {
        return false;
      }
    }

    // 2. Status filter
    if (statusFilter !== 'ALL') {
      const status = (batch.status || '').toLowerCase();
      if (status !== statusFilter.toLowerCase()) {
        return false;
      }
    }

    // 3. Omnibar Global search filter
    if (globalFilter && globalFilter.trim()) {
      const search = globalFilter.toLowerCase().trim();
      const matchTitle = String(batch.title || '').toLowerCase().includes(search);
      const matchStream = String(batch.stream || batch.target_focus || '').toLowerCase().includes(search);
      const matchDesc = String(batch.description || '').toLowerCase().includes(search);
      const matchPrice = String(batch.price ?? '').toLowerCase().includes(search);
      const matchStatus = String(batch.status || '').toLowerCase().includes(search);
      if (!(matchTitle || matchStream || matchDesc || matchPrice || matchStatus)) {
        return false;
      }
    }

    return true;
  });
}

// ═══════════════════════════════════════════════════════════════
// TEST SERIES FILTER & SEARCH LOGIC
// ═══════════════════════════════════════════════════════════════

function filterTestPackages({ packages, globalFilter = '', tagFilter = 'ALL', pricingFilter = 'ALL' }) {
  if (!Array.isArray(packages)) return [];

  return packages.filter(pkg => {
    // 1. Tag filter
    if (tagFilter !== 'ALL') {
      const pkgTag = (pkg.target_exam_tag || '').toLowerCase();
      const target = tagFilter.toLowerCase();
      if (!pkgTag.includes(target) && !target.includes(pkgTag)) {
        return false;
      }
    }

    // 2. Pricing filter
    if (pricingFilter !== 'ALL') {
      const isPremium = pkg.price_ledger?.status === 'premium' || (Number(pkg.price_ledger?.price || 0) > 0);
      if (pricingFilter === 'FREE' && isPremium) return false;
      if (pricingFilter === 'PREMIUM' && !isPremium) return false;
    }

    // 3. Omnibar Global search filter
    if (globalFilter && globalFilter.trim()) {
      const search = globalFilter.toLowerCase().trim();
      const matchTitle = String(pkg.title || '').toLowerCase().includes(search);
      const matchTag = String(pkg.target_exam_tag || '').toLowerCase().includes(search);
      const matchDesc = String(pkg.description || '').toLowerCase().includes(search);
      const matchPrice = String(pkg.price_ledger?.price ?? '').toLowerCase().includes(search);
      const matchStatus = String(pkg.price_ledger?.status || '').toLowerCase().includes(search);
      if (!(matchTitle || matchTag || matchDesc || matchPrice || matchStatus)) {
        return false;
      }
    }

    return true;
  });
}

// ═══════════════════════════════════════════════════════════════
// MULTI-COLUMN SORTING ENGINE
// ═══════════════════════════════════════════════════════════════

function sortDataset(data, sorting = []) {
  if (!Array.isArray(data) || sorting.length === 0) return [...data];

  return [...data].sort((a, b) => {
    for (const sort of sorting) {
      const { id, desc } = sort;
      let valA = a[id];
      let valB = b[id];

      // Nested property access (e.g. price_ledger.price)
      if (id.includes('.')) {
        const parts = id.split('.');
        valA = parts.reduce((acc, part) => acc?.[part], a);
        valB = parts.reduce((acc, part) => acc?.[part], b);
      }

      // Handle nulls / undefined
      if (valA === undefined || valA === null) valA = '';
      if (valB === undefined || valB === null) valB = '';

      let comparison = 0;
      if (typeof valA === 'number' && typeof valB === 'number') {
        comparison = valA - valB;
      } else if (valA instanceof Date || (!isNaN(Date.parse(valA)) && typeof valA === 'string' && valA.includes('T'))) {
        comparison = new Date(valA).getTime() - new Date(valB).getTime();
      } else {
        comparison = String(valA).localeCompare(String(valB), undefined, { numeric: true, sensitivity: 'base' });
      }

      if (comparison !== 0) {
        return desc ? -comparison : comparison;
      }
    }
    return 0;
  });
}

// ═══════════════════════════════════════════════════════════════
// PAGINATION CALCULATOR
// ═══════════════════════════════════════════════════════════════

function paginateDataset(data, pageIndex = 0, pageSize = 10) {
  const safePageSize = Math.max(1, pageSize);
  const totalCount = data.length;
  const pageCount = Math.ceil(totalCount / safePageSize) || 1;
  const safePageIndex = Math.max(0, Math.min(pageIndex, pageCount - 1));

  const startIdx = safePageIndex * safePageSize;
  const endIdx = Math.min(startIdx + safePageSize, totalCount);
  const pageRows = data.slice(startIdx, endIdx);

  const rangeStart = totalCount === 0 ? 0 : startIdx + 1;
  const rangeEnd = endIdx;

  return {
    totalCount,
    pageCount,
    pageIndex: safePageIndex,
    pageSize: safePageSize,
    pageRows,
    rangeText: `Showing ${rangeStart} to ${rangeEnd} of ${totalCount} entries`,
    canPreviousPage: safePageIndex > 0,
    canNextPage: safePageIndex < pageCount - 1
  };
}

// ═══════════════════════════════════════════════════════════════
// KPI STATS AGGREGATORS
// ═══════════════════════════════════════════════════════════════

function calculateBatchesKpiStats(batches = []) {
  const totalBatches = batches.length;
  const publishedCohorts = batches.filter(b => (b.status || '').toLowerCase() === 'published').length;
  const draftCohorts = batches.filter(b => (b.status || '').toLowerCase() === 'draft').length;
  const totalStudents = batches.reduce((sum, b) => sum + (Number(b.students_count) || 0), 0);
  const totalLiveClasses = batches.reduce((sum, b) => sum + (Number(b.live_sessions_count) || 0), 0);

  return {
    totalBatches,
    publishedCohorts,
    draftCohorts,
    totalStudents,
    totalLiveClasses
  };
}

function calculateTestSeriesKpiStats(packages = [], attempts = []) {
  const totalPackages = packages.length;
  const totalExams = packages.reduce((sum, p) => {
    if (Array.isArray(p.test_exams)) return sum + p.test_exams.length;
    return sum + (Number(p.total_tests_count) || 0);
  }, 0);

  const premiumPackages = packages.filter(p => {
    return p.price_ledger?.status === 'premium' || Number(p.price_ledger?.price || 0) > 0;
  }).length;

  const activeCandidates = attempts.length;
  const scores = attempts.map(a => Number(a.score) || 0).filter(s => !isNaN(s));
  const averageScore = scores.length > 0 
    ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10 
    : 0;

  return {
    totalPackages,
    totalExams,
    activeCandidates,
    premiumPackages,
    averageScore
  };
}

module.exports = {
  generateRfc4180Csv,
  filterBatches,
  filterTestPackages,
  sortDataset,
  paginateDataset,
  calculateBatchesKpiStats,
  calculateTestSeriesKpiStats
};
