import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import AnalyticsDashboard from './AnalyticsDashboard';

// Mock Supabase
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => Promise.resolve({ data: [], error: null })),
    })),
  })),
}));

describe('AnalyticsDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('displays loading state initially', () => {
    const { createClient } = require('@supabase/supabase-js');
    createClient.mockReturnValue({
      from: () => ({ select: () => new Promise(() => {}) }),
    });

    render(<AnalyticsDashboard />);
    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('displays total downloads after load', async () => {
    const { createClient } = require('@supabase/supabase-js');
    createClient.mockReturnValue({
      from: () => ({
        select: () => Promise.resolve({
          data: [
            { id: '1', title: 'Paper 1', downloads: 100, subject: 'Math', file_size: 1024 },
            { id: '2', title: 'Paper 2', downloads: 50, subject: 'Physics', file_size: 2048 },
          ],
          error: null,
        }),
      }),
    });

    render(<AnalyticsDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Total Downloads')).toBeInTheDocument();
      expect(screen.getByText('150')).toBeInTheDocument();
    });
  });

  it('displays storage usage', async () => {
    render(<AnalyticsDashboard />);
    await waitFor(() => {
      expect(screen.getByText('Storage Usage')).toBeInTheDocument();
    });
  });
});
