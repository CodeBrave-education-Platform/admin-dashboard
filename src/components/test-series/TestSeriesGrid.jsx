'use client'

import React, { useState, useMemo, useCallback } from 'react';
import { 
  Search, PlusCircle, Award, Layers, ClipboardList, 
  Trash2, Edit3, ArrowUpDown, Users, CheckCircle2, 
  Download, Sparkles, Zap, Radio, Atom, Activity, 
  GraduationCap, Trophy, Calendar, X, ChevronDown, 
  Filter, RotateCcw, FileSpreadsheet, Eye, BookOpen, 
  Check, AlertCircle, ArrowUpRight
} from 'lucide-react';

// =======================================================================
// EXAM THEME & COLOR CONFIGURATION
// =======================================================================
const EXAM_THEMES = {
  'jee main': {
    label: 'JEE Main',
    badgeClass: 'bg-blue-500/20 text-blue-200 border-blue-400/30',
    lightBadge: 'bg-blue-50 text-blue-700 border-blue-200',
    gradient: 'from-blue-600 via-indigo-700 to-slate-950',
    accentBorder: 'hover:border-blue-500/40',
    icon: Atom,
    patternText: 'JEE MAIN CBT'
  },
  'jee advanced': {
    label: 'JEE Advanced',
    badgeClass: 'bg-purple-500/20 text-purple-200 border-purple-400/30',
    lightBadge: 'bg-purple-50 text-purple-700 border-purple-200',
    gradient: 'from-purple-700 via-indigo-900 to-slate-950',
    accentBorder: 'hover:border-purple-500/40',
    icon: Sparkles,
    patternText: 'ADVANCED PROCTOR'
  },
  'neet': {
    label: 'NEET',
    badgeClass: 'bg-emerald-500/20 text-emerald-200 border-emerald-400/30',
    lightBadge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    gradient: 'from-emerald-600 via-teal-800 to-slate-950',
    accentBorder: 'hover:border-emerald-500/40',
    icon: Activity,
    patternText: 'NEET MEDICAL MOCK'
  },
  'foundation': {
    label: 'Foundation',
    badgeClass: 'bg-sky-500/20 text-sky-200 border-sky-400/30',
    lightBadge: 'bg-sky-50 text-sky-700 border-sky-200',
    gradient: 'from-sky-600 via-blue-800 to-slate-950',
    accentBorder: 'hover:border-sky-500/40',
    icon: GraduationCap,
    patternText: 'FOUNDATION STEM'
  },
  'kvpy': {
    label: 'KVPY',
    badgeClass: 'bg-amber-500/20 text-amber-200 border-amber-400/30',
    lightBadge: 'bg-amber-50 text-amber-700 border-amber-200',
    gradient: 'from-amber-600 via-orange-800 to-slate-950',
    accentBorder: 'hover:border-amber-500/40',
    icon: Trophy,
    patternText: 'KVPY SCHOLARSHIP'
  },
  'default': {
    label: 'Test Series',
    badgeClass: 'bg-indigo-500/20 text-indigo-200 border-indigo-400/30',
    lightBadge: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    gradient: 'from-indigo-700 via-slate-800 to-slate-950',
    accentBorder: 'hover:border-indigo-500/40',
    icon: Award,
    patternText: 'CBT ASSESSMENT'
  }
};

function getExamTheme(tag = '') {
  const normalized = String(tag || '').toLowerCase();
  if (normalized.includes('advanced')) return EXAM_THEMES['jee advanced'];
  if (normalized.includes('main')) return EXAM_THEMES['jee main'];
  if (normalized.includes('neet')) return EXAM_THEMES['neet'];
  if (normalized.includes('foundation') || normalized.includes('stem')) return EXAM_THEMES['foundation'];
  if (normalized.includes('kvpy') || normalized.includes('olympiad')) return EXAM_THEMES['kvpy'];
  return EXAM_THEMES['default'];
}

// =======================================================================
// PACKAGE THUMBNAIL COVER WITH FALLBACK GRADIENT
// =======================================================================
function PackageThumbnailMedia({ pkg, theme, isFeatured = false }) {
  const [imgError, setImgError] = useState(false);
  const ThemeIcon = theme.icon;
  const hasValidThumbnail = Boolean(pkg?.thumbnail_url) && !imgError;

  return (
    <div className={`relative w-full overflow-hidden bg-slate-900 ${isFeatured ? 'h-52 sm:h-60' : 'h-48'}`}>
      {hasValidThumbnail ? (
        <img
          src={pkg.thumbnail_url}
          alt={pkg.title || 'Test Package Thumbnail'}
          onError={() => setImgError(true)}
          className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500 ease-out"
          loading="lazy"
        />
      ) : (
        <div className={`w-full h-full bg-gradient-to-br ${theme.gradient} flex flex-col items-center justify-center p-6 text-center relative overflow-hidden group-hover:scale-105 transition-transform duration-500 ease-out`}>
          {/* Subtle Ambient Background Watermark Pattern */}
          <div className="absolute -right-8 -bottom-8 opacity-10 text-white pointer-events-none select-none">
            <ThemeIcon className="w-48 h-48" />
          </div>
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-white/10 via-transparent to-black/30 pointer-events-none" />

          {/* Central Stylized Emblem */}
          <div className="relative z-10 w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white shadow-xl mb-2 group-hover:rotate-6 transition-transform duration-300">
            <ThemeIcon className="w-7 h-7" />
          </div>
          <span className="relative z-10 text-[10px] font-black uppercase tracking-widest text-white/80 font-mono">
            {theme.patternText}
          </span>
        </div>
      )}

      {/* Dark Vignette Scrim for Maximum Badge Contrast */}
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/40 to-slate-950/20 pointer-events-none" />
    </div>
  );
}

// =======================================================================
// INDIVIDUAL BENTO CARD COMPONENT
// =======================================================================
function BentoTestPackageCard({
  pkg,
  enrollmentCount = 0,
  isSelected = false,
  isFeatured = false,
  onSelect,
  onToggleStatus,
  onDelete
}) {
  const theme = getExamTheme(pkg.target_exam_tag);
  const ThemeIcon = theme.icon;
  const isActive = pkg.is_active !== false;
  const dist = pkg.test_distribution || {};
  const drills = Number(dist.chapter_drills || 0);
  const mocks = Number(dist.full_mocks || 0);
  const live = Number(dist.live_papers || 0);
  const totalTests = pkg.total_tests_count !== undefined 
    ? Number(pkg.total_tests_count) 
    : (pkg.test_exams?.length || (drills + mocks + live) || 0);

  const priceInfo = pkg.price_ledger || {};
  const isPremium = priceInfo.status === 'premium' || Number(priceInfo.price || 0) > 0;
  const price = Number(priceInfo.price || 0);
  const originalPrice = priceInfo.original_price ? Number(priceInfo.original_price) : null;

  return (
    <div
      onClick={() => onSelect(pkg)}
      className={`group relative bg-white border rounded-3xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between cursor-pointer ${
        isSelected 
          ? 'border-indigo-600 ring-2 ring-indigo-500/20 shadow-indigo-100' 
          : 'border-slate-200/80 hover:border-slate-300'
      } ${isFeatured ? 'col-span-1 md:col-span-2 lg:col-span-2' : 'col-span-1'}`}
    >
      {/* Top Cover Media Container */}
      <div className="relative">
        <PackageThumbnailMedia pkg={pkg} theme={theme} isFeatured={isFeatured} />

        {/* Floating Badge (Top-Left): Target Exam Tag */}
        <div className="absolute top-3.5 left-3.5 z-10">
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider backdrop-blur-md border shadow-md ${theme.badgeClass}`}>
            <ThemeIcon className="w-3.5 h-3.5" />
            <span>{pkg.target_exam_tag || theme.label}</span>
          </span>
        </div>

        {/* Floating Badge (Top-Right): Interactive Live/Draft Switch */}
        <div className="absolute top-3.5 right-3.5 z-10">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleStatus(pkg, !isActive);
            }}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[10px] font-black backdrop-blur-md border transition-all duration-200 cursor-pointer shadow-md ${
              isActive
                ? 'bg-emerald-950/70 text-emerald-300 border-emerald-500/40 hover:bg-emerald-900/90 hover:border-emerald-400'
                : 'bg-slate-950/70 text-slate-400 border-white/15 hover:bg-slate-900/90 hover:text-slate-200'
            }`}
            title={isActive ? 'Click to Set Draft (Inactive)' : 'Click to Set Live (Active)'}
          >
            <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]' : 'bg-slate-500'}`} />
            <span>{isActive ? 'Active' : 'Inactive'}</span>
          </button>
        </div>

        {/* Floating Badge (Bottom-Left Over Scrim): Pricing Pill */}
        <div className="absolute bottom-3.5 left-3.5 z-10">
          {isPremium ? (
            <div className="inline-flex items-baseline gap-1.5 px-3 py-1 rounded-xl bg-slate-950/80 backdrop-blur-md border border-white/20 text-white shadow-md">
              <span className="text-xs font-black font-mono text-amber-300">
                ₹{price.toLocaleString('en-IN')}
              </span>
              {originalPrice && originalPrice > price && (
                <span className="text-[10px] text-slate-400 line-through font-mono">
                  ₹{originalPrice.toLocaleString('en-IN')}
                </span>
              )}
            </div>
          ) : (
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-emerald-600/90 backdrop-blur-md border border-emerald-400/40 text-white text-[10px] font-black uppercase tracking-wider shadow-md">
              <Sparkles className="w-3 h-3 text-emerald-200" />
              <span>FREE ACCESS</span>
            </span>
          )}
        </div>

        {/* Floating Badge (Bottom-Right Over Scrim): Enrolled Candidates */}
        <div className="absolute bottom-3.5 right-3.5 z-10 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-950/80 backdrop-blur-md border border-white/20 text-slate-200 text-[10px] font-bold font-mono shadow-md">
          <Users className="w-3.5 h-3.5 text-indigo-300" />
          <span>{Number(enrollmentCount).toLocaleString()} Enrolled</span>
        </div>
      </div>

      {/* Bento Card Content Area */}
      <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
        {/* Title, Subtitle, & Created Date */}
        <div>
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-sm sm:text-base font-black text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-1">
              {pkg.title}
            </h3>
            {isFeatured && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 text-[9px] font-black uppercase shrink-0">
                <Zap className="w-3 h-3 fill-amber-500 text-amber-500" />
                <span>Featured</span>
              </span>
            )}
          </div>

          <p className="text-xs text-slate-500 font-medium line-clamp-2 mt-1.5 min-h-[32px]">
            {pkg.description || 'Comprehensive proctored computer-based test series package for competitive preparation.'}
          </p>

          <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 mt-2.5" suppressHydrationWarning>
            <Calendar className="w-3 h-3 text-slate-400" />
            <span suppressHydrationWarning>
              Created {new Date(pkg.created_at || Date.now()).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
          </div>
        </div>

        {/* Test Distribution Breakdown Matrix */}
        <div className="bg-slate-50/80 border border-slate-100 p-3 rounded-2xl">
          <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2 flex items-center justify-between">
            <span>Test Distribution</span>
            <span className="text-indigo-600 font-bold font-mono">{totalTests} Papers</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
            {/* Drills */}
            <div className="bg-white border border-slate-200/70 px-2 py-1.5 rounded-xl flex items-center gap-1.5" title="Chapter-wise Practice Drills">
              <Layers className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
              <div className="min-w-0">
                <p className="text-[11px] font-black text-slate-800 font-mono leading-none">{drills}</p>
                <p className="text-[9px] font-bold text-slate-400 uppercase leading-tight mt-0.5">Drills</p>
              </div>
            </div>

            {/* Mocks */}
            <div className="bg-white border border-slate-200/70 px-2 py-1.5 rounded-xl flex items-center gap-1.5" title="Full Syllabus Mock Exams">
              <ClipboardList className="w-3.5 h-3.5 text-teal-500 shrink-0" />
              <div className="min-w-0">
                <p className="text-[11px] font-black text-slate-800 font-mono leading-none">{mocks}</p>
                <p className="text-[9px] font-bold text-slate-400 uppercase leading-tight mt-0.5">Mocks</p>
              </div>
            </div>

            {/* Live Papers */}
            <div className="bg-white border border-slate-200/70 px-2 py-1.5 rounded-xl flex items-center gap-1.5" title="Scheduled Live Assessments">
              <Radio className="w-3.5 h-3.5 text-rose-500 shrink-0" />
              <div className="min-w-0">
                <p className="text-[11px] font-black text-slate-800 font-mono leading-none">{live}</p>
                <p className="text-[9px] font-bold text-slate-400 uppercase leading-tight mt-0.5">Live</p>
              </div>
            </div>

            {/* Total Compiled */}
            <div className="bg-indigo-50/70 border border-indigo-100 px-2 py-1.5 rounded-xl flex items-center gap-1.5" title="Total Compiled Tests in Blueprint">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
              <div className="min-w-0">
                <p className="text-[11px] font-black text-indigo-900 font-mono leading-none">{totalTests}</p>
                <p className="text-[9px] font-bold text-indigo-500 uppercase leading-tight mt-0.5">Total</p>
              </div>
            </div>
          </div>
        </div>

        {/* Card Action Dock */}
        <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSelect(pkg);
            }}
            className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black transition flex items-center justify-center gap-2 cursor-pointer shadow-xs"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Manage Studio</span>
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(pkg);
            }}
            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 rounded-xl transition cursor-pointer"
            title="Delete Package Blueprint"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

// =======================================================================
// SKELETON LOADER FOR BENTO GRID
// =======================================================================
function BentoSkeletonGrid() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6 animate-pulse">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div 
          key={i} 
          className={`bg-white border border-slate-200 rounded-3xl overflow-hidden flex flex-col justify-between ${
            i === 1 ? 'col-span-1 md:col-span-2 lg:col-span-2' : 'col-span-1'
          }`}
        >
          <div className={`bg-slate-200 ${i === 1 ? 'h-52 sm:h-60' : 'h-48'}`} />
          <div className="p-5 space-y-4">
            <div className="space-y-2">
              <div className="h-4 bg-slate-200 rounded-md w-3/4" />
              <div className="h-3 bg-slate-100 rounded-md w-full" />
              <div className="h-3 bg-slate-100 rounded-md w-1/2" />
            </div>
            <div className="h-16 bg-slate-100 rounded-2xl" />
            <div className="h-9 bg-slate-200 rounded-xl" />
          </div>
        </div>
      ))}
    </div>
  );
}

// =======================================================================
// MAIN TEST SERIES BENTO GRID EXPORT COMPONENT
// =======================================================================
export default function TestSeriesGrid({
  packages = [],
  isLoading = false,
  isInitialLoading = false,
  packageEnrollments = {},
  selectedPackage = null,
  onSelectPackage,
  onCreatePackageClick,
  onTogglePackageStatus,
  onDeletePackage
}) {
  const [globalFilter, setGlobalFilter] = useState('');
  const [tagFilter, setTagFilter] = useState('ALL');
  const [pricingFilter, setPricingFilter] = useState('ALL');
  const [sortOption, setSortOption] = useState('newest'); // 'newest' | 'oldest' | 'enrolled' | 'tests' | 'price_desc' | 'price_asc'

  // Multi-stage filtering by Tag, Pricing, and Omnibar query
  const filteredPackages = useMemo(() => {
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

      // 3. Global search omnibar filter
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
  }, [packages, tagFilter, pricingFilter, globalFilter]);

  // Multi-column sorting
  const sortedPackages = useMemo(() => {
    const list = [...filteredPackages];

    return list.sort((a, b) => {
      if (sortOption === 'newest') {
        return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
      }
      if (sortOption === 'oldest') {
        return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
      }
      if (sortOption === 'enrolled') {
        const countA = packageEnrollments[a.id] || a.enrolled_count || 0;
        const countB = packageEnrollments[b.id] || b.enrolled_count || 0;
        return countB - countA;
      }
      if (sortOption === 'tests') {
        const testsA = a.total_tests_count !== undefined ? a.total_tests_count : (a.test_exams?.length || 0);
        const testsB = b.total_tests_count !== undefined ? b.total_tests_count : (b.test_exams?.length || 0);
        return testsB - testsA;
      }
      if (sortOption === 'price_desc') {
        const priceA = Number(a.price_ledger?.price || 0);
        const priceB = Number(b.price_ledger?.price || 0);
        return priceB - priceA;
      }
      if (sortOption === 'price_asc') {
        const priceA = Number(a.price_ledger?.price || 0);
        const priceB = Number(b.price_ledger?.price || 0);
        return priceA - priceB;
      }
      return 0;
    });
  }, [filteredPackages, sortOption, packageEnrollments]);

  // Safe RFC4180 CSV Exporter
  const handleExportCSV = useCallback(() => {
    const dataToExport = sortedPackages;
    const headers = [
      'ID',
      'Title',
      'Target Exam Tag',
      'Status',
      'Price (INR)',
      'Original Price (INR)',
      'Total Tests',
      'Chapter Drills',
      'Full Mocks',
      'Live Papers',
      'Enrolled Candidates',
      'Created At'
    ];

    const escapeCell = (val) => {
      if (val === null || val === undefined) return '""';
      const str = String(val);
      return `"${str.replace(/"/g, '""')}"`;
    };

    const csvRows = [headers.join(',')];

    for (const item of dataToExport) {
      const dist = item.test_distribution || {};
      const priceInfo = item.price_ledger || {};
      const enrolled = packageEnrollments[item.id] || item.enrolled_count || 0;

      csvRows.push([
        escapeCell(item.id),
        escapeCell(item.title || ''),
        escapeCell(item.target_exam_tag || ''),
        item.is_active !== false ? '"ACTIVE"' : '"INACTIVE"',
        escapeCell(priceInfo.price || 0),
        escapeCell(priceInfo.original_price || ''),
        escapeCell(item.total_tests_count || 0),
        escapeCell(dist.chapter_drills || 0),
        escapeCell(dist.full_mocks || 0),
        escapeCell(dist.live_papers || 0),
        escapeCell(enrolled),
        escapeCell(item.created_at || '')
      ].join(','));
    }

    const blob = new Blob([csvRows.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `test_packages_catalog_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [sortedPackages, packageEnrollments]);

  const handleResetFilters = () => {
    setGlobalFilter('');
    setTagFilter('ALL');
    setPricingFilter('ALL');
    setSortOption('newest');
  };

  const isFiltersActive = globalFilter !== '' || tagFilter !== 'ALL' || pricingFilter !== 'ALL';
  const showLoading = isLoading || isInitialLoading;

  return (
    <div className="space-y-6">
      {/* ------------------------------------------------------------- */}
      {/* TOP CONTROL DECK: SEARCH OMNIBAR + FILTER PILLS + ACTIONS */}
      {/* ------------------------------------------------------------- */}
      <div className="bg-white border border-slate-200 p-4 sm:p-5 rounded-3xl space-y-4 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Search Omnibar */}
          <div className="relative flex-1 max-w-lg">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
            <input
              type="text"
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              placeholder="Search test packages by title, exam tag, or description..."
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-10 pr-9 py-2.5 text-xs text-slate-900 font-bold outline-none focus:border-indigo-500 focus:bg-white transition"
            />
            {globalFilter && (
              <button
                type="button"
                onClick={() => setGlobalFilter('')}
                className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 p-0.5 rounded-full"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Right Control Actions: Sort Dropdown, CSV Export, & Create CTA */}
          <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
            {/* Sort Selector Dropdown */}
            <div className="relative inline-block">
              <select
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value)}
                className="appearance-none bg-slate-50 border border-slate-200 rounded-2xl pl-3.5 pr-8 py-2 text-xs font-bold text-slate-700 outline-none hover:bg-slate-100 cursor-pointer transition shadow-2xs"
              >
                <option value="newest">Sort: Newest First</option>
                <option value="oldest">Sort: Oldest First</option>
                <option value="enrolled">Sort: Most Enrolled</option>
                <option value="tests">Sort: Most Tests</option>
                <option value="price_desc">Sort: Price High-Low</option>
                <option value="price_asc">Sort: Price Low-High</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-3 pointer-events-none" />
            </div>

            {/* CSV Export Button */}
            <button
              type="button"
              onClick={handleExportCSV}
              disabled={sortedPackages.length === 0}
              className="px-3.5 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 disabled:opacity-50 text-slate-700 rounded-2xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shrink-0 shadow-2xs"
              title="Export filtered packages to CSV"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span className="hidden sm:inline">Export CSV</span>
            </button>

            {/* Primary Blueprint Creation CTA */}
            <button
              type="button"
              onClick={onCreatePackageClick}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-black transition flex items-center gap-2 cursor-pointer shadow-sm shrink-0"
            >
              <PlusCircle className="w-4 h-4" />
              <span>New Test Package</span>
            </button>
          </div>
        </div>

        {/* Secondary Filter Pill Strip: Tags + Pricing Tiers */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-100">
          <div className="flex items-center gap-3 overflow-x-auto pb-1 sm:pb-0">
            {/* Exam Tag Filter Pills */}
            <div className="flex items-center gap-1.5 shrink-0">
              {[
                { id: 'ALL', label: 'All Exams' },
                { id: 'JEE Main', label: 'JEE Main' },
                { id: 'JEE Advanced', label: 'JEE Adv' },
                { id: 'NEET', label: 'NEET' },
                { id: 'Foundation', label: 'Foundation' },
                { id: 'KVPY', label: 'KVPY' }
              ].map(pill => {
                const isActive = tagFilter === pill.id;
                return (
                  <button
                    key={pill.id}
                    type="button"
                    onClick={() => setTagFilter(pill.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer shrink-0 ${
                      isActive
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-slate-50 border border-slate-200/80 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {pill.label}
                  </button>
                );
              })}
            </div>

            {/* Pricing Filter Pills */}
            <div className="flex items-center gap-1.5 pl-3 border-l border-slate-200 shrink-0">
              {[
                { id: 'ALL', label: 'All Tiers' },
                { id: 'FREE', label: 'Free' },
                { id: 'PREMIUM', label: 'Premium' }
              ].map(pill => {
                const isActive = pricingFilter === pill.id;
                return (
                  <button
                    key={pill.id}
                    type="button"
                    onClick={() => setPricingFilter(pill.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer shrink-0 ${
                      isActive
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'bg-slate-50 border border-slate-200/80 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {pill.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active Filter Indicator & Reset */}
          {isFiltersActive && (
            <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
              <span className="text-[11px] font-bold text-slate-500">
                Found {sortedPackages.length} of {packages.length}
              </span>
              <button
                type="button"
                onClick={handleResetFilters}
                className="text-[11px] font-black text-indigo-600 hover:text-indigo-700 flex items-center gap-1 cursor-pointer bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-lg transition"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* BENTO GRID DISPLAY AREA */}
      {/* ------------------------------------------------------------- */}
      {showLoading ? (
        <BentoSkeletonGrid />
      ) : sortedPackages.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-3xl py-20 px-6 text-center space-y-4 shadow-sm">
          <div className="w-14 h-14 bg-indigo-50 border border-indigo-100 rounded-2xl flex items-center justify-center text-indigo-600 mx-auto">
            <Award className="w-7 h-7" />
          </div>
          <div className="space-y-1.5">
            <h3 className="text-base font-black text-slate-800">No Test Packages Found</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto font-medium">
              {isFiltersActive
                ? 'No test packages match your current search and filter criteria. Try adjusting or resetting filters.'
                : 'Start by creating your first test series package blueprint with chapter drills, mocks, and proctored live exams.'}
            </p>
          </div>

          <div className="pt-2 flex items-center justify-center gap-3">
            {isFiltersActive ? (
              <button
                type="button"
                onClick={handleResetFilters}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Filters</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onCreatePackageClick}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black transition inline-flex items-center gap-2 cursor-pointer shadow-sm"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Create Test Package</span>
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6">
          {sortedPackages.map((pkg, index) => {
            // Give visual emphasis to the first package when there are at least 3 packages and no active text search
            const isFeatured = index === 0 && sortedPackages.length >= 3 && !globalFilter;

            return (
              <BentoTestPackageCard
                key={pkg.id || index}
                pkg={pkg}
                enrollmentCount={packageEnrollments[pkg.id] || pkg.enrolled_count || 0}
                isSelected={selectedPackage?.id === pkg.id}
                isFeatured={isFeatured}
                onSelect={(selected) => onSelectPackage?.(selected)}
                onToggleStatus={(targetPkg, nextStatus) => {
                  if (onTogglePackageStatus) {
                    onTogglePackageStatus(targetPkg, nextStatus);
                  }
                }}
                onDelete={(targetPkg) => {
                  if (onDeletePackage) {
                    onDeletePackage(targetPkg);
                  }
                }}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
