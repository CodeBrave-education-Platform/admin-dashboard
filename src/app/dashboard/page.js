'use client'

import React from 'react';
import AdminLayoutShell from '@/components/AdminLayoutShell';
import AdminDashboardClient from '@/components/AdminDashboardClient';

export default function DashboardOverviewPage() {
  return (
    <AdminLayoutShell 
      title="Admin Dashboard"
      subtitle="Overview of students, courses, and platform activity."
    >
      <AdminDashboardClient />
    </AdminLayoutShell>
  );
}
