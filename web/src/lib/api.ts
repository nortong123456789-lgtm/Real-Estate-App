import { Listing, MediaFile, DraftUpdatePayload } from '@/types';

export function getApiBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  // Node.js SSR Server side requires absolute URL
  if (typeof window === 'undefined') {
    return 'http://127.0.0.1:8000/api';
  }
  // Client Browser side uses relative URL via Nginx
  return '/api';
}

export function getMediaProxyUrl(media?: MediaFile): string {
  if (!media) return '';
  const baseUrl = getApiBaseUrl();
  if (media.telegram_file_id) {
    return `${baseUrl}/listings/media/${media.telegram_file_id}`;
  }
  if (media.temp_filename) {
    return `${baseUrl}/listings/temp-media/${media.temp_filename}`;
  }
  return '';
}

export async function fetchDraftListings(): Promise<Listing[]> {
  const baseUrl = getApiBaseUrl();
  const res = await fetch(`${baseUrl}/listings/drafts`, { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to fetch draft listings');
  return res.json();
}

export async function fetchActiveListings(): Promise<Listing[]> {
  const baseUrl = getApiBaseUrl();
  const res = await fetch(`${baseUrl}/listings`, { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to fetch active listings');
  return res.json();
}

export async function updateDraftListing(id: string, payload: DraftUpdatePayload): Promise<Listing> {
  const baseUrl = getApiBaseUrl();
  const res = await fetch(`${baseUrl}/listings/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error('Failed to update draft listing');
  return res.json();
}

export async function deleteListing(id: string): Promise<boolean> {
  const baseUrl = getApiBaseUrl();
  const res = await fetch(`${baseUrl}/listings/${id}`, {
    method: 'DELETE'
  });
  if (!res.ok) throw new Error('Failed to delete listing');
  return true;
}
