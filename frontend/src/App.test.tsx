import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';

function jsonResponse(payload: unknown, ok = true) {
  return { ok, json: async () => payload } as Response;
}

function makeApplication(id: number, company: string, role: string) {
  return {
    id,
    company,
    role,
    stage: 'Applied',
    applied_date: '2026-10-06',
    source: 'Referral',
    salary: 0,
    notes: '',
    archived: false,
    follow_up_date: null,
    contact_name: '',
    contact_email: '',
  };
}

function makeDashboard(applications: ReturnType<typeof makeApplication>[]) {
  return {
    metrics: { total: applications.length, active: applications.length, interviews: 0, response_rate: 0, offers: 0, follow_ups: 0 },
    stages: [{ stage: 'Applied', count: applications.length }],
    applications,
    interviews: [],
  };
}

describe('CareerPilot application workflows', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url === '/api/auth/status') return jsonResponse({ required: false, authenticated: true });
      if (url.startsWith('/api/analytics')) return jsonResponse({ days: 180, start_date: '2026-04-10', total: 0, response_count: 0, response_rate: 0, average_response_days: null, interview_to_offer_rate: 0, stages: [], trend: [] });
      if (url === '/api/dashboard') return jsonResponse(makeDashboard([makeApplication(1, 'Northstar', 'Data Analyst')]));
      if (url === '/api/applications' && init?.method === 'POST') return jsonResponse(makeApplication(2, 'NewCo', 'Product Analyst'));
      if (url === '/api/practice/status') return jsonResponse({ mode: 'local-demo', configured: false });
      throw new Error(`Unexpected fetch: ${url}`);
    }));
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('loads persisted applications and submits a new application to the API', async () => {
    const user = userEvent.setup();
    render(<App />);

    expect((await screen.findAllByText('Northstar')).length).toBeGreaterThan(0);
    await user.click(screen.getByRole('button', { name: 'Add application' }));
    await user.type(screen.getByRole('textbox', { name: 'Company name' }), 'NewCo');
    await user.type(screen.getByRole('textbox', { name: 'Role title' }), 'Product Analyst');
    const form = document.querySelector('.application-modal');
    expect(form).toBeTruthy();
    fireEvent.submit(form!);

    await waitFor(() => expect(fetch).toHaveBeenCalledWith('/api/applications', expect.objectContaining({ method: 'POST' })));
  });

  it('shows the login screen and unlocks the workspace after a successful login', async () => {
    const user = userEvent.setup();
    vi.mocked(fetch).mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === '/api/auth/status') return jsonResponse({ required: true, authenticated: false });
      if (url === '/api/auth/login') return jsonResponse({ authenticated: true });
      if (url === '/api/dashboard') return jsonResponse(makeDashboard([makeApplication(1, 'Northstar', 'Data Analyst')]));
      if (url.startsWith('/api/analytics')) return jsonResponse({ days: 180, start_date: '2026-04-10', total: 0, response_count: 0, response_rate: 0, average_response_days: null, interview_to_offer_rate: 0, stages: [], trend: [] });
      throw new Error(`Unexpected fetch: ${url}`);
    });
    render(<App />);

    await user.type(await screen.findByLabelText('Password'), 'test-password');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    expect((await screen.findAllByText('Northstar')).length).toBeGreaterThan(0);
    expect(fetch).toHaveBeenCalledWith('/api/auth/login', expect.objectContaining({ method: 'POST' }));
  });
});