'use client'

import React, { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/utils/supabase/client';
import { 
  BarChart3, Search, Download, Users, 
  CheckCircle2, Clock, Award, Loader2, ArrowUpDown 
} from 'lucide-react';
import { useToast } from '@/components/ToastProvider';

export default function SubmissionsTab({
  packageData,
  exams = []
}) {
  const supabase = createClient();
  const { showToast } = useToast();

  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedExamFilter, setSelectedExamFilter] = useState('ALL');

  const packageExams = (exams || []).filter(e => e.package_id === packageData?.id);
  const examIds = packageExams.map(e => e.id);

  // Fetch all attempts for this package's exams
  useEffect(() => {
    const fetchAttempts = async () => {
      if (examIds.length === 0) {
        setAttempts([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('test_attempts')
          .select('*, profiles(full_name, email), test_exams(title)')
          .in('exam_id', examIds)
          .order('completed_at', { ascending: false });

        if (!error && Array.isArray(data)) {
          setAttempts(data);
        } else {
          // Fallback to simple query if relational join constraints are absent
          const { data: fallbackData } = await supabase
            .from('test_attempts')
            .select('*')
            .in('exam_id', examIds);

          setAttempts(fallbackData || []);
        }
      } catch (err) {
        console.warn('[Submissions Tab] Error fetching attempts:', err.message);
        setAttempts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchAttempts();
  }, [packageData?.id, exams]);

  // Filter attempts
  const filteredAttempts = useMemo(() => {
    return attempts.filter(att => {
      // Exam filter
      if (selectedExamFilter !== 'ALL' && att.exam_id !== selectedExamFilter) {
        return false;
      }

      // Search term
      if (searchTerm.trim()) {
        const search = searchTerm.toLowerCase();
        const name = (att.profiles?.full_name || '').toLowerCase();
        const email = (att.profiles?.email || '').toLowerCase();
        const examTitle = (att.test_exams?.title || '').toLowerCase();
        if (!name.includes(search) && !email.includes(search) && !examTitle.includes(search)) {
          return false;
        }
      }

      return true;
    });
  }, [attempts, selectedExamFilter, searchTerm]);

  const formatDuration = (secs) => {
    if (!secs) return '0m 0s';
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}m ${s}s`;
  };

  const handleExportCSV = () => {
    if (filteredAttempts.length === 0) {
      showToast('No submission records to export', 'error');
      return;
    }

    const headers = ['Attempt ID', 'Candidate Name', 'Candidate Email', 'Exam Title', 'Score (Pts)', 'Duration (Seconds)', 'Completed At'];
    const rows = [headers.join(',')];

    for (const att of filteredAttempts) {
      rows.push([
        `"${att.id}"`,
        `"${(att.profiles?.full_name || 'Anonymous').replace(/"/g, '""')}"`,
        `"${(att.profiles?.email || '').replace(/"/g, '""')}"`,
        `"${(att.test_exams?.title || '').replace(/"/g, '""')}"`,
        att.score || 0,
        att.total_duration_seconds || 0,
        `"${att.completed_at || ''}"`
      ].join(','));
    }

    const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gradebook_${packageData?.title?.replace(/[^a-z0-9]/gi, '_')}_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Exported submissions gradebook CSV', 'success');
  };

  return (
    <div className="space-y-6">
      {/* Action & Filter Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-indigo-600" />
            <span>Candidate Submissions & Gradebook ({filteredAttempts.length})</span>
          </h3>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Verified CBT examination attempts and score breakdowns for &ldquo;{packageData?.title}&rdquo;
          </p>
        </div>

        <button
          type="button"
          onClick={handleExportCSV}
          disabled={filteredAttempts.length === 0}
          className="px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-xs shrink-0"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export Gradebook CSV</span>
        </button>
      </div>

      {/* Filter Deck */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative flex-1 w-full sm:max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search candidate name, email, or exam..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9.5 pr-4 py-2 text-xs font-bold text-slate-900 outline-none focus:border-indigo-500 focus:bg-white transition"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-[10px] font-black uppercase text-slate-400">Exam Paper:</span>
          <select
            value={selectedExamFilter}
            onChange={e => setSelectedExamFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none cursor-pointer focus:border-indigo-500"
          >
            <option value="ALL">All Exams ({packageExams.length})</option>
            {packageExams.map(ex => (
              <option key={ex.id} value={ex.id}>
                {ex.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Gradebook Table */}
      <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-2xs">
        {loading ? (
          <div className="p-12 text-center space-y-3">
            <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mx-auto" />
            <p className="text-xs font-bold text-slate-500">Loading student attempts...</p>
          </div>
        ) : filteredAttempts.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <Users className="w-10 h-10 text-slate-300 mx-auto" />
            <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider">
              No Submissions Found
            </h4>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              {searchTerm || selectedExamFilter !== 'ALL'
                ? 'No candidate scorecards match your search criteria.'
                : 'No candidate test session attempts have been completed yet.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-[10px] font-black uppercase text-slate-500 tracking-wider">
                  <th className="px-4 py-3.5">Candidate</th>
                  <th className="px-4 py-3.5">Exam Blueprint</th>
                  <th className="px-4 py-3.5">Score</th>
                  <th className="px-4 py-3.5">Time Spent</th>
                  <th className="px-4 py-3.5 text-right">Completed At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-bold">
                {filteredAttempts.map(att => (
                  <tr key={att.id} className="hover:bg-slate-50/60 transition">
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 font-black flex items-center justify-center text-xs shrink-0">
                          {(att.profiles?.full_name || 'A').charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-slate-900 truncate font-black">
                            {att.profiles?.full_name || 'Anonymous Student'}
                          </p>
                          <p className="text-[10px] text-slate-400 font-medium truncate">
                            {att.profiles?.email || 'No email registered'}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-3.5">
                      <span className="text-slate-800 truncate max-w-[200px] block">
                        {att.test_exams?.title || 'General Exam'}
                      </span>
                    </td>

                    <td className="px-4 py-3.5">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-black bg-indigo-50 text-indigo-700 border border-indigo-100 font-mono">
                        {att.score} pts
                      </span>
                    </td>

                    <td className="px-4 py-3.5">
                      <span className="text-slate-600 font-mono text-[11px]">
                        {formatDuration(att.total_duration_seconds)}
                      </span>
                    </td>

                    <td className="px-4 py-3.5 text-right text-[10px] text-slate-400 font-medium" suppressHydrationWarning>
                      {att.completed_at ? new Date(att.completed_at).toLocaleString() : '--'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
