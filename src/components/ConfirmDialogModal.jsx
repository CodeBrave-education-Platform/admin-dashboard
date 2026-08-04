'use client'

import React from 'react';
import { AlertTriangle, Trash2, CheckCircle2, X, AlertCircle } from 'lucide-react';

export default function ConfirmDialogModal({
  isOpen,
  title = 'Confirm Action',
  message = 'Are you sure you want to proceed?',
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  type = 'danger', // 'danger' | 'warning' | 'info'
  onConfirm,
  onCancel
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 z-[9999] animate-fade-in">
      <div className="bg-white border border-slate-200 p-6 rounded-3xl max-w-md w-full space-y-5 shadow-2xl">
        <div className="flex items-start gap-4">
          <div className={`p-3 rounded-2xl shrink-0 ${
            type === 'danger' 
              ? 'bg-rose-50 text-rose-600 border border-rose-200' 
              : 'bg-amber-50 text-amber-600 border border-amber-200'
          }`}>
            {type === 'danger' ? <Trash2 className="w-6 h-6" /> : <AlertTriangle className="w-6 h-6" />}
          </div>

          <div className="space-y-1 flex-1">
            <h3 className="text-base font-black text-slate-900">{title}</h3>
            <p className="text-xs text-slate-500 font-medium leading-relaxed">{message}</p>
          </div>

          <button 
            type="button" 
            onClick={onCancel} 
            className="text-slate-400 hover:text-slate-700 font-bold text-sm"
          >
            ✕
          </button>
        </div>

        <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
          >
            {cancelLabel}
          </button>

          <button
            type="button"
            onClick={onConfirm}
            className={`px-5 py-2.5 font-black text-xs rounded-xl transition cursor-pointer flex items-center gap-1.5 shadow-sm ${
              type === 'danger'
                ? 'bg-rose-600 hover:bg-rose-700 text-white'
                : 'bg-indigo-600 hover:bg-indigo-700 text-white'
            }`}
          >
            {type === 'danger' ? <Trash2 className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
            <span>{confirmLabel}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
