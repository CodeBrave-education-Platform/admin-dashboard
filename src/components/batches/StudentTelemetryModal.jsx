'use client'

import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Mail, Phone, GraduationCap, Users, 
  BookOpen, Clock, BarChart2, CheckCircle2, Award 
} from 'lucide-react';

export default function StudentTelemetryModal({ student, isOpen, onClose }) {
  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !student) return null;

  const isNeet = (student.target_focus || student.academic_batch || '').toUpperCase().includes('NEET');
  const studentInitials = (student.full_name || student.name || 'ST')
    .split(' ')
    .map(n => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 md:p-6 animate-fade-in">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 cursor-pointer"
        />

        {/* Modal Container */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 15 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="bg-white border border-slate-200 rounded-3xl max-w-xl w-full flex flex-col shadow-2xl relative text-slate-800 overflow-hidden z-10 p-6 md:p-8"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-200 pb-5 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-700 font-black text-sm uppercase shadow-2xs">
                {studentInitials}
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900 leading-tight">
                  {student.full_name || student.name || 'Anonymous Student'}
                </h3>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  Student ID: <span className="font-mono text-slate-400">{student.id || student.user_id || 'N/A'}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase border tracking-wider shadow-2xs ${
                isNeet
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                  : 'bg-indigo-50 text-indigo-700 border-indigo-200'
              }`}>
                {isNeet ? 'NEET Focus' : 'JEE Focus'}
              </span>

              <button
                type="button"
                onClick={onClose}
                className="p-1.5 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-700 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Student Bento Telemetry Cards */}
          <div className="flex-1 overflow-y-auto py-5 space-y-4 max-h-[380px]">
            {/* 4 Core Parameter Cards */}
            <div className="grid grid-cols-2 gap-3.5">
              <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-2xl">
                <div className="flex items-center justify-between text-slate-400 mb-1">
                  <span className="text-[9px] font-black uppercase tracking-wider">Subjects Track</span>
                  <BookOpen className="w-3.5 h-3.5 text-indigo-500" />
                </div>
                <p className="text-xs font-bold text-slate-800 truncate">
                  {student.preferred_subjects || student.preferred_subject || (isNeet ? 'PCB (Physics, Chem, Bio)' : 'PCM (Physics, Chem, Math)')}
                </p>
              </div>

              <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-2xl">
                <div className="flex items-center justify-between text-slate-400 mb-1">
                  <span className="text-[9px] font-black uppercase tracking-wider">Daily Study Target</span>
                  <Clock className="w-3.5 h-3.5 text-teal-500" />
                </div>
                <p className="text-xs font-bold text-slate-800 truncate">
                  {student.daily_study_hours || '8 Hours / Day'}
                </p>
              </div>

              <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-2xl">
                <div className="flex items-center justify-between text-slate-400 mb-1">
                  <span className="text-[9px] font-black uppercase tracking-wider">Mock Exam Avg</span>
                  <BarChart2 className="w-3.5 h-3.5 text-indigo-600" />
                </div>
                <p className="text-xs font-black text-indigo-700 font-mono">
                  {student.test_average || '214 / 300'}
                </p>
              </div>

              <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-2xl">
                <div className="flex items-center justify-between text-slate-400 mb-1">
                  <span className="text-[9px] font-black uppercase tracking-wider">Syllabus Coverage</span>
                  <Award className="w-3.5 h-3.5 text-emerald-500" />
                </div>
                <p className="text-xs font-black text-emerald-700 font-mono">
                  {student.syllabus_progress || '68% Completed'}
                </p>
              </div>
            </div>

            {/* Extended Telemetry Info List */}
            <div className="space-y-2.5 pt-3 border-t border-slate-200">
              <div className="space-y-1 text-xs">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Email Address</span>
                <div className="flex items-center gap-2.5 text-slate-800 font-bold bg-slate-50 p-2.5 rounded-xl border border-slate-200 select-all font-mono text-[11px]">
                  <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                  <span>{student.email || 'N/A'}</span>
                </div>
              </div>

              {student.phone && (
                <div className="space-y-1 text-xs">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Phone Contact</span>
                  <div className="flex items-center gap-2.5 text-slate-800 font-bold bg-slate-50 p-2.5 rounded-xl border border-slate-200 font-mono text-[11px]">
                    <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                    <span>{student.phone}</span>
                  </div>
                </div>
              )}

              <div className="space-y-1 text-xs">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Dream College</span>
                <div className="flex items-center gap-2.5 text-slate-800 font-bold bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-xs">
                  <GraduationCap className="w-4 h-4 text-indigo-500 shrink-0" />
                  <span>{student.dream_college || (isNeet ? 'AIIMS New Delhi' : 'IIT Bombay (Computer Science)')}</span>
                </div>
              </div>

              <div className="space-y-1 text-xs">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Assigned Academic Mentor</span>
                <div className="flex items-center gap-2.5 text-slate-800 font-bold bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-xs">
                  <Users className="w-4 h-4 text-teal-600 shrink-0" />
                  <span>{student.study_mentor || 'Dr. Sarah Jenkins'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-5 pt-4 border-t border-slate-200 flex justify-end shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
            >
              Close Telemetry
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
