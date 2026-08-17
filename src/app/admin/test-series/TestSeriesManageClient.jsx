'use client'

import React from 'react';
import TestSeriesStatsHeader from '@/components/test-series/TestSeriesStatsHeader';
import TestSeriesGrid from '@/components/test-series/TestSeriesGrid';
import TestSeriesEditorDrawer from '@/components/test-series/TestSeriesEditorDrawer';
import TestSeriesCreateModal from '@/components/test-series/TestSeriesCreateModal';

export default function TestSeriesManageClient(props) {
  return (
    <div className="space-y-6">
      <TestSeriesStatsHeader {...props} />
      <TestSeriesGrid {...props} />
    </div>
  );
}
