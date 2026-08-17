'use client'

import React, { useState, useMemo } from 'react';
import {
  useLegacyTable as useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  getPaginationRowModel
} from '@tanstack/react-table/legacy';
import { flexRender } from '@tanstack/react-table';
import { 
  Search, PlusCircle, Award, Layers, ClipboardList, 
  Trash2, Edit3, ArrowUpDown, ChevronLeft, ChevronRight, 
  ChevronsLeft, ChevronsRight, Users, CheckCircle2, 
  Download, Sparkles, Zap, Radio
} from 'lucide-react';

export default function TestSeriesGrid({
  packages = [],
  isLoading = false,
  packageEnrollments = {},
  onSelectPackage,
  onCreatePackageClick,
  onTogglePackageStatus,
  onDeletePackage
}) {
  const [globalFilter, setGlobalFilter] = useState('');
  const [tagFilter, setTagFilter] = useState('ALL');
  const [pricingFilter, setPricingFilter] = useState('ALL');
  const [sorting, setSorting] = useState([{ id: 'created_at', desc: true }]);
  const [rowSelection, setRowSelection] = useState({});

  // Filter packages by Tag and Pricing tier
  const filteredData = useMemo(() => {
    return packages.filter(pkg => {
      // Tag filter
      if (tagFilter !== 'ALL') {
        const pkgTag = (pkg.target_exam_tag || '').toLowerCase();
        const targetTag = tagFilter.toLowerCase();
        if (!pkgTag.includes(targetTag) && !targetTag.includes(pkgTag)) {
          return false;
        }
      }

      // Pricing filter
      if (pricingFilter !== 'ALL') {
        const isPremium = pkg.price_ledger?.status === 'premium' || (Number(pkg.price_ledger?.price || 0) > 0);
        if (pricingFilter === 'FREE' && isPremium) return false;
        if (pricingFilter === 'PREMIUM' && !isPremium) return false;
      }

      return true;
    });
  }, [packages, tagFilter, pricingFilter]);

  // Custom global search filter covering title, tag, description, and branch
  const globalFilterFn = useMemo(() => (row, columnId, filterValue) => {
    const search = String(filterValue || '').toLowerCase().trim();
    if (!search) return true;
    const pkg = row.original;
    const matchTitle = String(pkg.title || '').toLowerCase().includes(search);
    const matchTag = String(pkg.target_exam_tag || '').toLowerCase().includes(search);
    const matchDesc = String(pkg.description || '').toLowerCase().includes(search);
    const matchPrice = String(pkg.price_ledger?.price || '').toLowerCase().includes(search);
    const matchStatus = String(pkg.price_ledger?.status || '').toLowerCase().includes(search);
    return matchTitle || matchTag || matchDesc || matchPrice || matchStatus;
  }, []);

  // Column definitions for TanStack Table
  const columns = useMemo(() => [
    {
      id: 'select',
      header: ({ table }) => (
        <input
          type="checkbox"
          checked={table.getIsAllPageRowsSelected()}
          onChange={table.getToggleAllPageRowsSelectedHandler()}
          className="rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
          aria-label="Select all packages"
        />
      ),
      cell: ({ row }) => (
        <input
          type="checkbox"
          checked={row.getIsSelected()}
          disabled={!row.getCanSelect()}
          onChange={row.getToggleSelectedHandler()}
          onClick={(e) => e.stopPropagation()}
          className="rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
          aria-label="Select package row"
        />
      ),
      size: 40,
      enableSorting: false
    },
    {
      accessorKey: 'created_at',
      id: 'created_at',
      header: ({ column }) => (
        <button
          type="button"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="flex items-center gap-1.5 text-[10px] font-black uppercase text-slate-500 hover:text-slate-900 cursor-pointer"
        >
          <span>Created</span>
          <ArrowUpDown className="w-3 h-3 text-slate-400" />
        </button>
      ),
      enableHiding: true
    },
    {
      accessorKey: 'title',
      header: ({ column }) => (
        <button
          type="button"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="flex items-center gap-1.5 text-[10px] font-black uppercase text-slate-500 hover:text-slate-900 cursor-pointer"
        >
          <span>Package Identity</span>
          <ArrowUpDown className="w-3 h-3 text-slate-400" />
        </button>
      ),
      cell: ({ row }) => {
        const pkg = row.original;
        return (
          <div className="flex items-center gap-3 min-w-[240px]">
            {pkg.thumbnail_url ? (
              <img
                src={pkg.thumbnail_url}
                alt={pkg.title}
                className="w-11 h-11 rounded-xl object-cover border border-slate-200 shrink-0 bg-slate-100"
              />
            ) : (
              <div className="w-11 h-11 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
                <Award className="w-5 h-5" />
              </div>
            )}
            <div className="min-w-0">
              <p className="text-xs font-black text-slate-900 truncate max-w-[260px] group-hover:text-indigo-600 transition">
                {pkg.title}
              </p>
              <p className="text-[10px] text-slate-400 font-medium truncate mt-0.5" suppressHydrationWarning>
                {pkg.description ? pkg.description.slice(0, 45) + '...' : 'Proctored CBT Mock Series'}
                {' • '}
                {new Date(pkg.created_at || Date.now()).toLocaleDateString()}
              </p>
            </div>
          </div>
        );
      }
    },
    {
      accessorKey: 'target_exam_tag',
      id: 'target_exam_tag',
      header: ({ column }) => (
        <button
          type="button"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="flex items-center gap-1.5 text-[10px] font-black uppercase text-slate-500 hover:text-slate-900 cursor-pointer"
        >
          <span>Target Tag</span>
          <ArrowUpDown className="w-3 h-3 text-slate-400" />
        </button>
      ),
      cell: ({ row }) => {
        const tag = (row.original.target_exam_tag || 'JEE Main').toLowerCase();
        let badgeStyle = 'bg-indigo-50 text-indigo-700 border-indigo-200';
        let label = row.original.target_exam_tag || 'JEE Main';

        if (tag.includes('advanced')) {
          badgeStyle = 'bg-purple-50 text-purple-700 border-purple-200';
        } else if (tag.includes('neet')) {
          badgeStyle = 'bg-rose-50 text-rose-700 border-rose-200';
        } else if (tag.includes('foundation')) {
          badgeStyle = 'bg-sky-50 text-sky-700 border-sky-200';
        } else if (tag.includes('kvpy')) {
          badgeStyle = 'bg-amber-50 text-amber-700 border-amber-200';
        }

        return (
          <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-black border uppercase tracking-wider ${badgeStyle}`}>
            {label}
          </span>
        );
      }
    },
    {
      id: 'distribution',
      header: () => (
        <span className="text-[10px] font-black uppercase text-slate-500">Test Distribution</span>
      ),
      cell: ({ row }) => {
        const pkg = row.original;
        const dist = pkg.test_distribution || {};
        const drills = dist.chapter_drills || 0;
        const mocks = dist.full_mocks || 0;
        const live = dist.live_papers || 0;
        const total = pkg.total_tests_count !== undefined ? pkg.total_tests_count : (pkg.test_exams?.length || 0);

        return (
          <div className="flex items-center gap-1.5 flex-wrap min-w-[200px]">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-extrabold" title="Chapter Drills">
              <Layers className="w-3 h-3 text-indigo-500" />
              <span>{drills} Drills</span>
            </span>

            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-extrabold" title="Full Mocks">
              <ClipboardList className="w-3 h-3 text-teal-500" />
              <span>{mocks} Mocks</span>
            </span>

            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-extrabold" title="Live Papers">
              <Radio className="w-3 h-3 text-rose-500" />
              <span>{live} Live</span>
            </span>

            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-100 text-[10px] font-black" title="Total Compiled Tests">
              <span>{total} Total</span>
            </span>
          </div>
        );
      }
    },
    {
      accessorKey: 'is_active',
      id: 'status',
      header: ({ column }) => (
        <button
          type="button"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="flex items-center gap-1.5 text-[10px] font-black uppercase text-slate-500 hover:text-slate-900 cursor-pointer"
        >
          <span>Status</span>
          <ArrowUpDown className="w-3 h-3 text-slate-400" />
        </button>
      ),
      cell: ({ row }) => {
        const pkg = row.original;
        const isActive = pkg.is_active !== false;
        return (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (onTogglePackageStatus) {
                onTogglePackageStatus(pkg.id, !isActive);
              }
            }}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black border transition cursor-pointer ${
              isActive
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'
            }`}
            title={isActive ? 'Click to Deactivate Package' : 'Click to Activate Package'}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-slate-400'}`} />
            <span>{isActive ? 'Active' : 'Inactive'}</span>
          </button>
        );
      }
    },
    {
      id: 'pricing',
      header: ({ column }) => (
        <button
          type="button"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="flex items-center gap-1.5 text-[10px] font-black uppercase text-slate-500 hover:text-slate-900 cursor-pointer"
        >
          <span>Pricing</span>
          <ArrowUpDown className="w-3 h-3 text-slate-400" />
        </button>
      ),
      cell: ({ row }) => {
        const pkg = row.original;
        const priceInfo = pkg.price_ledger || {};
        const isPremium = priceInfo.status === 'premium' || Number(priceInfo.price || 0) > 0;
        const price = priceInfo.price || 0;
        const originalPrice = priceInfo.original_price;

        if (!isPremium) {
          return (
            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase tracking-wider">
              FREE
            </span>
          );
        }

        return (
          <div className="flex items-baseline gap-1.5">
            <span className="text-xs font-black text-slate-900 font-mono">
              ₹{Number(price).toLocaleString('en-IN')}
            </span>
            {originalPrice && originalPrice > price && (
              <span className="text-[10px] text-slate-400 line-through font-mono">
                ₹{Number(originalPrice).toLocaleString('en-IN')}
              </span>
            )}
          </div>
        );
      }
    },
    {
      id: 'enrolled',
      header: () => (
        <span className="text-[10px] font-black uppercase text-slate-500">Enrolled</span>
      ),
      cell: ({ row }) => {
        const pkg = row.original;
        const count = packageEnrollments[pkg.id] || pkg.enrolled_count || 0;
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200 font-mono">
            <Users className="w-3 h-3" />
            <span>{count} Students</span>
          </span>
        );
      }
    },
    {
      id: 'actions',
      header: () => (
        <span className="text-[10px] font-black uppercase text-slate-500 text-right block">Actions</span>
      ),
      cell: ({ row }) => {
        const pkg = row.original;
        return (
          <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => onSelectPackage(pkg)}
              className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-600 text-indigo-600 hover:text-white border border-indigo-200 hover:border-indigo-600 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1"
              title="Open Package Studio Drawer"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Edit</span>
            </button>

            <button
              type="button"
              onClick={() => onDeletePackage(pkg.id)}
              className="p-1.5 hover:bg-rose-50 rounded-xl text-slate-400 hover:text-rose-600 transition cursor-pointer"
              title="Delete Package Blueprint"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        );
      }
    }
  ], [onSelectPackage, onDeletePackage, onTogglePackageStatus, packageEnrollments]);

  const table = useReactTable({
    data: filteredData,
    columns,
    state: {
      globalFilter,
      sorting,
      rowSelection
    },
    globalFilterFn,
    autoResetPageIndex: true,
    onGlobalFilterChange: setGlobalFilter,
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize: 10
      },
      sorting: [{ id: 'created_at', desc: true }]
    }
  });

  const handleTagFilterChange = (tag) => {
    setTagFilter(tag);
    table.setPageIndex(0);
  };

  const handlePricingFilterChange = (pricing) => {
    setPricingFilter(pricing);
    table.setPageIndex(0);
  };

  const handleGlobalFilterChange = (val) => {
    setGlobalFilter(val);
    table.setPageIndex(0);
  };

  const selectedCount = Object.keys(rowSelection).length;

  const handleExportCSV = () => {
    const selectedRows = table.getSelectedRowModel().rows;
    const exportData = selectedRows.length > 0
      ? selectedRows.map(r => r.original)
      : table.getFilteredRowModel().rows.map(r => r.original);

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
        `"${item.id}"`,
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

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `test_packages_export_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      {/* Control Deck: Search Omnibar + Filter Pills + Action Buttons */}
      <div className="bg-white border border-slate-200 p-4 sm:p-5 rounded-3xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
        {/* Search Omnibar */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={globalFilter ?? ''}
            onChange={e => handleGlobalFilterChange(e.target.value)}
            placeholder="Search test packages by title, tag, or description..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9.5 pr-4 py-2 text-xs text-slate-900 font-bold outline-none focus:border-indigo-500 focus:bg-white transition"
          />
        </div>

        {/* Tag & Pricing Filter Pills */}
        <div className="flex items-center gap-3 overflow-x-auto pb-1 md:pb-0">
          {/* Exam Tag Filter Pills */}
          <div className="flex items-center gap-1.5">
            {[
              { id: 'ALL', label: 'All Tags' },
              { id: 'JEE Main', label: 'JEE Main' },
              { id: 'JEE Advanced', label: 'Advanced' },
              { id: 'NEET', label: 'NEET' },
              { id: 'Foundation', label: 'Foundation' }
            ].map(pill => {
              const isActive = tagFilter === pill.id;
              return (
                <button
                  key={pill.id}
                  type="button"
                  onClick={() => handleTagFilterChange(pill.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer shrink-0 ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {pill.label}
                </button>
              );
            })}
          </div>

          {/* Pricing Filter Pills */}
          <div className="flex items-center gap-1.5 pl-2 border-l border-slate-200">
            {[
              { id: 'ALL', label: 'All' },
              { id: 'FREE', label: 'Free' },
              { id: 'PREMIUM', label: 'Premium' }
            ].map(pill => {
              const isActive = pricingFilter === pill.id;
              return (
                <button
                  key={pill.id}
                  type="button"
                  onClick={() => handlePricingFilterChange(pill.id)}
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-black transition cursor-pointer shrink-0 ${
                    isActive
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {pill.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Primary Action Button */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onCreatePackageClick}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-xs"
          >
            <PlusCircle className="w-4 h-4" />
            <span>New Test Package</span>
          </button>
        </div>
      </div>

      {/* Bulk Action Floating Bar (when rows are selected) */}
      {selectedCount > 0 && (
        <div className="bg-indigo-900 text-white px-5 py-3 rounded-2xl flex items-center justify-between shadow-lg animate-fade-in">
          <div className="flex items-center gap-2 text-xs font-bold">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{selectedCount} test package(s) selected</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleExportCSV}
              className="px-3 py-1.5 bg-indigo-800 hover:bg-indigo-700 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
            <button
              type="button"
              onClick={() => setRowSelection({})}
              className="text-xs text-indigo-200 hover:text-white font-bold cursor-pointer"
            >
              Deselect All
            </button>
          </div>
        </div>
      )}

      {/* TanStack Table Data Grid */}
      <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="p-12 text-center space-y-3">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="text-xs font-bold text-slate-500">Loading test series catalog...</p>
          </div>
        ) : table.getRowModel().rows.length === 0 ? (
          <div className="py-20 text-center space-y-4">
            <Award className="w-12 h-12 text-slate-300 mx-auto" />
            <div className="space-y-1">
              <h3 className="text-sm font-extrabold text-slate-700">No Test Packages Found</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                {globalFilter
                  ? `No packages matching "${globalFilter}". Try clearing your search filter.`
                  : 'Start by creating your first test series package blueprint.'}
              </p>
            </div>
            <button
              type="button"
              onClick={onCreatePackageClick}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition inline-flex items-center gap-2 cursor-pointer shadow-xs"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Create Test Package</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                {table.getHeaderGroups().map(headerGroup => (
                  <tr key={headerGroup.id} className="bg-slate-50/80 border-b border-slate-200">
                    {headerGroup.headers.map(header => (
                      <th key={header.id} className="px-4 py-3.5 font-bold text-slate-500 select-none">
                        {header.isPlaceholder
                          ? null
                          : flexRender(header.column.columnDef.header, header.getContext())}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody className="divide-y divide-slate-100">
                {table.getRowModel().rows.map(row => (
                  <tr
                    key={row.id}
                    onClick={() => onSelectPackage(row.original)}
                    className="hover:bg-slate-50/80 transition cursor-pointer group"
                  >
                    {row.getVisibleCells().map(cell => (
                      <td key={cell.id} className="px-4 py-3.5">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {!isLoading && table.getRowModel().rows.length > 0 && (
          <div className="px-6 py-4 border-t border-slate-150 bg-slate-50/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3 text-xs text-slate-500 font-bold">
              <span>
                Showing {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1} to{' '}
                {Math.min((table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize, filteredData.length)}{' '}
                of {filteredData.length} entries
              </span>

              <div className="flex items-center gap-1.5 ml-2">
                <span className="text-[10px] uppercase font-black text-slate-400">Rows:</span>
                <select
                  value={table.getState().pagination.pageSize}
                  onChange={e => table.setPageSize(Number(e.target.value))}
                  className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold text-slate-700 outline-none cursor-pointer"
                >
                  {[10, 20, 30, 50].map(pageSize => (
                    <option key={pageSize} value={pageSize}>
                      {pageSize}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => table.setPageIndex(0)}
                disabled={!table.getCanPreviousPage()}
                className="p-1.5 bg-white border border-slate-200 hover:bg-slate-100 rounded-xl text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
                title="First Page"
              >
                <ChevronsLeft className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
                className="p-1.5 bg-white border border-slate-200 hover:bg-slate-100 rounded-xl text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
                title="Previous Page"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <span className="text-xs font-extrabold text-slate-700 px-2 font-mono">
                Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount() || 1}
              </span>

              <button
                type="button"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
                className="p-1.5 bg-white border border-slate-200 hover:bg-slate-100 rounded-xl text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
                title="Next Page"
              >
                <ChevronRight className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                disabled={!table.getCanNextPage()}
                className="p-1.5 bg-white border border-slate-200 hover:bg-slate-100 rounded-xl text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
                title="Last Page"
              >
                <ChevronsRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
