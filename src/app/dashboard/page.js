'use client'

import React from 'react';
import AdminLayoutShell from '@/components/AdminLayoutShell';
import AdminDashboardClient from '@/components/AdminDashboardClient';

export default function DashboardOverviewPage() {
  return (
    <AdminLayoutShell 
      title="Administrative Overview Console"
      subtitle="Monitor dynamic student registry rosters, JEE CBT scorecards, and live class poll distributions"
    >
      <AdminDashboardClient />
    </AdminLayoutShell>
  );
}
