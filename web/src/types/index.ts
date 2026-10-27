export type ListingStatus = 'draft' | 'active' | 'rented';

export interface MediaFile {
  id: number;
  telegram_file_id?: string;
  temp_filename?: string;
  file_type: string;
  original_filename?: string;
}

export interface Listing {
  id: string;
  status: ListingStatus;
  configuration?: string;
  rent_amount?: number;
  neighborhood?: string;
  latitude?: number;
  longitude?: number;
  distanceKm?: number;
  media_files: MediaFile[];
  created_at: string;
}

export interface DraftUpdatePayload {
  configuration: string;
  rent_amount: number;
  neighborhood: string;
  latitude: number;
  longitude: number;
  status?: ListingStatus;
}

export interface HeaderProps {
  draftsCount: number;
  onOpenDrafts: () => void;
  onSearchQuery?: (query: string, coords?: { lat: number; lng: number }) => void;
}
