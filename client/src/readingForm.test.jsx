import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from './main';

afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.restoreAllMocks();
});

describe('reading form', () => {
  it('requires a glucose value before submitting a reading', async () => {
    const store = new Map();
    vi.stubGlobal('localStorage', { getItem: key => store.get(key) ?? null, setItem: (key, value) => store.set(key, String(value)), removeItem: key => store.delete(key), clear: () => store.clear() });
    const fetchMock = vi.fn(async (url, options = {}) => {
      if (String(url).includes('/auth/login')) {
        return { ok: true, json: async () => ({ token: 'demo-token', user: { id: 1, name: 'Demo Patient', email: 'demo@example.com', role: 'patient' } }) };
      }
      if (String(url).includes('/readings?')) return { ok: true, json: async () => ({ readings: [], pagination: { page: 1, limit: 20, total: 0, pages: 0 } }) };
      if (String(url).includes('/reports?')) return { ok: true, json: async () => ({ daily: { start: '2026-01-01', end: '2026-01-01', readings: [], count: 0 }, monthToDate: { start: '2026-01-01', end: '2026-01-01', count: 0 }, previousMonth: { start: '2025-12-01', end: '2026-01-01', count: 0 }, trendReadings: [] }) };
      return { ok: false, json: async () => ({ error: 'Unexpected request' }) };
    });
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();
    render(<App/>);
    await user.type(screen.getByLabelText('Email address'), 'demo@example.com');
    await user.type(screen.getByLabelText('Password'), 'password123');
    await user.click(screen.getByRole('button', { name: /sign in/i }));
    const glucose = await screen.findByLabelText('GLUCOSE VALUE');
    expect(glucose).toBeRequired();
    await user.click(screen.getByRole('button', { name: /save reading/i }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(fetchMock.mock.calls.some(([url, options]) => String(url).endsWith('/readings') && options?.method === 'POST')).toBe(false);
  });
});
