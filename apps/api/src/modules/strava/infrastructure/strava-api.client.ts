import { Injectable } from '@nestjs/common';

const STRAVA_BASE = 'https://www.strava.com';

export interface StravaTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_at: number; // Unix timestamp (seconds)
  athlete: { id: number };
}

export interface StravaActivitySummary {
  id: number;
  name: string;
  sport_type: string;
  type: string; // deprecated but still present
  start_date: string; // ISO 8601 UTC
  elapsed_time: number; // seconds
  distance: number; // meters
  total_elevation_gain: number; // meters
  average_heartrate?: number;
  max_heartrate?: number;
  average_speed?: number; // m/s
  average_watts?: number;
  average_cadence?: number;
  kilojoules?: number;
  calories?: number;
}

@Injectable()
export class StravaApiClient {
  private get clientId() { return process.env.STRAVA_CLIENT_ID!; }
  private get clientSecret() { return process.env.STRAVA_CLIENT_SECRET!; }
  private get redirectUri() { return process.env.STRAVA_REDIRECT_URI!; }

  getAuthUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      response_type: 'code',
      redirect_uri: this.redirectUri,
      scope: 'activity:read_all',
      approval_prompt: 'auto',
      state,
    });
    return `${STRAVA_BASE}/oauth/authorize?${params}`;
  }

  async exchangeCode(code: string): Promise<StravaTokenResponse> {
    const res = await fetch(`${STRAVA_BASE}/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        code,
        grant_type: 'authorization_code',
      }),
    });
    if (!res.ok) throw new Error(`Strava code exchange failed: ${res.status}`);
    return res.json() as Promise<StravaTokenResponse>;
  }

  async refreshAccessToken(refreshToken: string): Promise<StravaTokenResponse> {
    const res = await fetch(`${STRAVA_BASE}/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    });
    if (!res.ok) throw new Error(`Strava token refresh failed: ${res.status}`);
    return res.json() as Promise<StravaTokenResponse>;
  }

  async fetchActivities(
    accessToken: string,
    after?: number,
    page = 1,
  ): Promise<StravaActivitySummary[]> {
    const params = new URLSearchParams({ per_page: '200', page: String(page) });
    if (after) params.set('after', String(after));

    const res = await fetch(`${STRAVA_BASE}/api/v3/athlete/activities?${params}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) throw new Error(`Strava fetch activities failed: ${res.status}`);
    return res.json() as Promise<StravaActivitySummary[]>;
  }
}
