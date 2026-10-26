import { Listing, MediaFile, DraftUpdatePayload } from '@/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

export function getMediaProxyUrl(media?: MediaFile): string {
  if (!media) return '';
  if (media.telegram_file_id) {
    return `${API_BASE_URL}/listings/media/${media.telegram_file_id}`;
  }
  if (media.temp_filename) {
    return `${API_BASE_URL}/listings/temp-media/${media.temp_filename}`;
  }
  return '';
}

export async function fetchDraftListings(): Promise<Listing[]> {
  const res = await fetch(`${API_BASE_URL}/listings/drafts`, { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to fetch draft listings');
  return res.json();
}

export async function fetchActiveListings(): Promise<Listing[]> {
  const res = await fetch(`${API_BASE_URL}/listings`, { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to fetch active listings');
  return res.json();
}

export async function updateDraftListing(id: string, payload: DraftUpdatePayload): Promise<Listing> {
  const res = await fetch(`${API_BASE_URL}/listings/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error('Failed to update draft listing');
  return res.json();
}

export async function deleteListing(id: string): Promise<boolean> {
  const res = await fetch(`${API_BASE_URL}/listings/${id}`, {
    method: 'DELETE'
  });
  if (!res.ok) throw new Error('Failed to delete listing');
  return true;
}
