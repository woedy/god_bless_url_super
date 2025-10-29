export interface TokenResponse {
  access: string;
  refresh: string;
}

export interface BulkCreatePayload {
  url: string;
  size?: number;
  count?: number;
  code_length?: number;
  expires_at?: string | null;
}

export interface LinkDto {
  id: number;
  code: string;
  short_url: string;
  target_url: string;
  is_active: boolean;
  expires_at: string | null;
  click_count: number;
  created_at: string;
  updated_at: string;
}

export interface BulkCreateResponse {
  links: LinkDto[];
  message?: string;
}

export interface ClickEventDto {
  ts: string;
  ip: string | null;
  user_agent: string | null;
  referrer: string | null;
  country: string | null;
}

export interface LinkStatsResponse {
  link: LinkDto;
  total_clicks: number;
  recent_clicks: ClickEventDto[];
}

const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:8000';

async function parseResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let message = 'Request failed';
    try {
      const data = await res.json();
      message = data.detail || data.message || JSON.stringify(data);
    } catch (err) {
      // ignore json parse errors
    }
    throw new Error(message);
  }
  return res.json() as Promise<T>;
}

export async function login(username: string, password: string): Promise<TokenResponse> {
  const res = await fetch(`${API_BASE}/api/auth/token/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });
  return parseResponse<TokenResponse>(res);
}

export async function bulkCreateLinks(token: string, payload: BulkCreatePayload): Promise<BulkCreateResponse> {
  const res = await fetch(`${API_BASE}/api/links/bulk/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(payload)
  });
  return parseResponse<BulkCreateResponse>(res);
}

export async function fetchLinks(token: string): Promise<LinkDto[]> {
  const res = await fetch(`${API_BASE}/api/links/`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
  return parseResponse<LinkDto[]>(res);
}

export async function fetchStats(token: string, code: string): Promise<LinkStatsResponse> {
  const res = await fetch(`${API_BASE}/api/links/${code}/stats/`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
  return parseResponse<LinkStatsResponse>(res);
}

export async function deleteLink(token: string, code: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/links/${code}/`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  if (!res.ok) {
    let message = 'Failed to delete link';
    try {
      const data = await res.json();
      message = data.detail || data.message || JSON.stringify(data);
    } catch (err) {
      // ignore json parse errors
    }
    throw new Error(message);
  }
}
