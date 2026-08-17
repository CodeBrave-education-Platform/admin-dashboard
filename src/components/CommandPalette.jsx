'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Command } from 'cmdk'
import { Search, Monitor, Book, GraduationCap, Users, Ticket, Activity, FileText } from 'lucide-react'

export default function CommandPalette() {
  const [open, setOpen] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const down = (e) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((open) => !open)
      }
    }
    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [])

  const runCommand = (command) => {
    setOpen(false)
    command()
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[99999] bg-slate-900/50 backdrop-blur-sm flex justify-center pt-[15vh] p-4 animate-fade-in select-none">
      <div className="bg-white rounded-2xl w-full max-w-xl shadow-2xl border border-slate-200 overflow-hidden relative">
        <Command label="Global Command Palette" className="h-full max-h-[400px] flex flex-col bg-white">
          <div className="flex items-center border-b border-slate-100 px-4 py-3 gap-3" cmdk-input-wrapper="">
            <Search className="w-5 h-5 text-slate-400 shrink-0" />
            <Command.Input 
              autoFocus
              placeholder="Search features, students, courses, or jump to..." 
              className="flex-1 bg-transparent text-sm font-bold outline-none text-slate-800 placeholder:text-slate-400 placeholder:font-medium"
            />
            <button onClick={() => setOpen(false)} className="text-[10px] font-black text-slate-400 bg-slate-100 px-2 py-1 rounded-md uppercase tracking-wider hover:bg-slate-200">
              ESC
            </button>
          </div>

          <Command.List className="overflow-y-auto p-2 custom-scrollbar">
            <Command.Empty className="p-8 text-center text-sm text-slate-500 font-medium">
              No results found. Try a different search.
            </Command.Empty>

            <Command.Group heading="Navigation" className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2 py-1">
              <Command.Item 
                onSelect={() => runCommand(() => router.push('/dashboard'))}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer aria-selected:bg-indigo-50 aria-selected:text-indigo-700 text-slate-700 font-bold text-xs mt-1 transition-colors"
              >
                <Monitor className="w-4 h-4 text-indigo-500" />
                <span>Overview Dashboard</span>
              </Command.Item>
              <Command.Item 
                onSelect={() => runCommand(() => router.push('/batches'))}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer aria-selected:bg-indigo-50 aria-selected:text-indigo-700 text-slate-700 font-bold text-xs mt-1 transition-colors"
              >
                <Activity className="w-4 h-4 text-emerald-500" />
                <span>Cohort Batches & Live Classes</span>
              </Command.Item>
              <Command.Item 
                onSelect={() => runCommand(() => router.push('/courses'))}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer aria-selected:bg-indigo-50 aria-selected:text-indigo-700 text-slate-700 font-bold text-xs mt-1 transition-colors"
              >
                <Book className="w-4 h-4 text-teal-500" />
                <span>Course Blueprint Studio</span>
              </Command.Item>
              <Command.Item 
                onSelect={() => runCommand(() => router.push('/admin/test-series'))}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer aria-selected:bg-indigo-50 aria-selected:text-indigo-700 text-slate-700 font-bold text-xs mt-1 transition-colors"
              >
                <Activity className="w-4 h-4 text-rose-500" />
                <span>Test Series Catalog</span>
              </Command.Item>
              <Command.Item 
                onSelect={() => runCommand(() => router.push('/admin/students'))}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer aria-selected:bg-indigo-50 aria-selected:text-indigo-700 text-slate-700 font-bold text-xs mt-1 transition-colors"
              >
                <Users className="w-4 h-4 text-blue-500" />
                <span>Student Relationship Manager</span>
              </Command.Item>
              <Command.Item 
                onSelect={() => runCommand(() => router.push('/admin/questions'))}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer aria-selected:bg-indigo-50 aria-selected:text-indigo-700 text-slate-700 font-bold text-xs mt-1 transition-colors"
              >
                <GraduationCap className="w-4 h-4 text-purple-500" />
                <span>Question Bank Studio</span>
              </Command.Item>
              <Command.Item 
                onSelect={() => runCommand(() => router.push('/admin/books'))}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer aria-selected:bg-indigo-50 aria-selected:text-indigo-700 text-slate-700 font-bold text-xs mt-1 transition-colors"
              >
                <Book className="w-4 h-4 text-amber-500" />
                <span>Book Inventory & Fulfillments</span>
              </Command.Item>
              <Command.Item 
                onSelect={() => runCommand(() => router.push('/admin/invoices'))}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer aria-selected:bg-indigo-50 aria-selected:text-indigo-700 text-slate-700 font-bold text-xs mt-1 transition-colors"
              >
                <FileText className="w-4 h-4 text-cyan-500" />
                <span>Tax Invoices & Revenue Audit</span>
              </Command.Item>
            </Command.Group>

            <Command.Group heading="Quick Actions" className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2 py-1 mt-3">
              <Command.Item 
                onSelect={() => runCommand(() => router.push('/admin/test-series/compiler'))}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer aria-selected:bg-slate-100 aria-selected:text-slate-900 text-slate-700 font-bold text-xs mt-1 transition-colors"
              >
                <FileText className="w-4 h-4 text-slate-500" />
                <span>Compile New CBT Exam</span>
              </Command.Item>
              <Command.Item 
                onSelect={() => runCommand(() => router.push('/gradebook'))}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer aria-selected:bg-slate-100 aria-selected:text-slate-900 text-slate-700 font-bold text-xs mt-1 transition-colors"
              >
                <GraduationCap className="w-4 h-4 text-indigo-500" />
                <span>View Cohort Gradebook</span>
              </Command.Item>
            </Command.Group>
          </Command.List>
        </Command>
      </div>
      
      {/* Required for styling cmdk */}
      <style jsx global>{`
        [cmdk-group-heading] {
          padding-left: 0.5rem;
          padding-right: 0.5rem;
          padding-top: 0.25rem;
          padding-bottom: 0.25rem;
          font-size: 10px;
          font-weight: 900;
          color: #94a3b8;
          text-transform: uppercase;
          letter-spacing: 0.1em;
        }
      `}</style>
    </div>
  )
}
