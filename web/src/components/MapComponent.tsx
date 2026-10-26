'use client';

import React, { useState } from 'react';
import { APIProvider, Map, Marker, InfoWindow } from '@vis.gl/react-google-maps';
import { Listing } from '@/types';
import { Building, MapPin, Camera, ExternalLink, Compass, Layers } from 'lucide-react';
import { getMediaProxyUrl } from '@/lib/api';

interface MapComponentProps {
  activeListings: Listing[];
  selectedCoords: { lat: number; lng: number } | null;
  mapCenter?: { lat: number; lng: number } | null;
  onMapClick?: (coords: { lat: number; lng: number }) => void;
  onSelectListing?: (listing: Listing) => void;
  apiKey: string;
}

const BENGALURU_DEFAULT_CENTER = { lat: 12.9716, lng: 77.5946 };

export default function MapComponent({
  activeListings,
  selectedCoords,
  mapCenter,
  onMapClick,
  onSelectListing,
  apiKey
}: MapComponentProps) {
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [forceOsmFallback, setForceOsmFallback] = useState<boolean>(false);

  const currentCenter = mapCenter || BENGALURU_DEFAULT_CENTER;

  // Verify whether the API Key is a real key or placeholder
  const isValidApiKey = Boolean(
    apiKey &&
    apiKey !== 'YOUR_GOOGLE_MAPS_API_KEY' &&
    !apiKey.includes('YOUR_') &&
    apiKey.length > 20
  ) && !forceOsmFallback;

  return (
    <div
      className="w-full h-full min-h-[500px] relative rounded-2xl md:rounded-3xl overflow-hidden border border-slate-200/80 shadow-md bg-slate-100"
      style={{ width: '100%', height: '100%', minHeight: '500px' }}
    >
      {/* Top Left Floating Map Badge */}
      <div className="absolute top-3 left-3 z-10 bg-white/95 backdrop-blur-md px-3.5 py-2 rounded-2xl border border-slate-200 text-xs font-extrabold text-slate-800 shadow-md flex items-center gap-2">
        <MapPin className="w-4 h-4 text-brand-500 flex-shrink-0" />
        <span>Bengaluru Property Map ({activeListings.length} Active Pins)</span>
      </div>

      {/* Top Right Map Engine Toggle Badge */}
      <div className="absolute top-3 right-3 z-10 flex items-center gap-2">
        <button
          onClick={() => setForceOsmFallback(!forceOsmFallback)}
          className="bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-200 text-[11px] font-bold text-slate-700 hover:text-brand-500 shadow-sm flex items-center gap-1.5 transition-all"
        >
          <Layers className="w-3.5 h-3.5 text-brand-500" />
          <span>{forceOsmFallback ? 'Switch to Google Maps' : 'Switch to OpenStreetMap'}</span>
        </button>
      </div>

      {isValidApiKey ? (
        <APIProvider apiKey={apiKey}>
          <Map
            defaultCenter={BENGALURU_DEFAULT_CENTER}
            center={currentCenter}
            defaultZoom={12}
            mapId="DEMO_MAP_ID"
            gestureHandling={'greedy'}
            disableDefaultUI={false}
            className="w-full h-full min-h-[500px]"
            style={{ width: '100%', height: '100%', minHeight: '500px' }}
            onClick={(e) => {
              if (e.detail.latLng && onMapClick) {
                onMapClick({ lat: e.detail.latLng.lat, lng: e.detail.latLng.lng });
              }
            }}
          >
            {/* Active Property Pins in Coral Brand Color */}
            {activeListings.map((listing) => (
              listing.latitude && listing.longitude ? (
                <Marker
                  key={listing.id}
                  position={{ lat: listing.latitude, lng: listing.longitude }}
                  onClick={() => setSelectedListing(listing)}
                  icon={{
                    path: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z',
                    fillColor: '#FF5A3C',
                    fillOpacity: 1,
                    strokeWeight: 2,
                    strokeColor: '#FFFFFF',
                    scale: 1.8
                  }}
                />
              ) : null
            ))}

            {/* Draft Target Selected Pin */}
            {selectedCoords && (
              <Marker
                position={selectedCoords}
                icon={{
                  path: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z',
                  fillColor: '#101828',
                  fillOpacity: 1,
                  strokeWeight: 2,
                  strokeColor: '#FF5A3C',
                  scale: 2
                }}
              />
            )}

            {/* Info Window for Selected Active Listing */}
            {selectedListing && selectedListing.latitude && selectedListing.longitude && (
              <InfoWindow
                position={{ lat: selectedListing.latitude, lng: selectedListing.longitude }}
                onCloseClick={() => setSelectedListing(null)}
              >
                <div className="p-1 max-w-[220px] md:max-w-xs font-sans">
                  {selectedListing.media_files[0] && (
                    <img
                      src={getMediaProxyUrl(selectedListing.media_files[0])}
                      alt="Property"
                      className="w-full h-24 object-cover rounded-xl mb-2"
                    />
                  )}
                  <div className="flex items-center gap-1.5 text-brand-500 font-bold text-sm mb-1">
                    <Building className="w-4 h-4" />
                    <span>{selectedListing.configuration || 'Property Listing'}</span>
                  </div>
                  <div className="text-lg font-black text-slate-900 mb-1">
                    ₹{selectedListing.rent_amount?.toLocaleString('en-IN')}/mo
                  </div>
                  <div className="text-xs text-slate-500 mb-2 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <span>{selectedListing.neighborhood || 'Bengaluru'}</span>
                  </div>

                  {/* View Details Button inside InfoWindow */}
                  <button
                    onClick={() => {
                      if (onSelectListing) onSelectListing(selectedListing);
                    }}
                    className="w-full mt-2 py-2 px-3 bg-brand-500 hover:bg-brand-600 text-white font-extrabold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition-colors"
                  >
                    <span>View & Edit Property</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                </div>
              </InfoWindow>
            )}
          </Map>
        </APIProvider>
      ) : (
        /* Free Interactive OpenStreetMap Tile Canvas Engine */
        <div
          className="w-full h-full min-h-[500px] relative overflow-hidden"
          style={{ width: '100%', height: '100%', minHeight: '500px' }}
        >
          <iframe
            title="Bengaluru Property Map"
            width="100%"
            height="100%"
            style={{ border: 0, minHeight: '500px', width: '100%' }}
            loading="lazy"
            src={`https://www.openstreetmap.org/export/embed.html?bbox=77.45,12.82,77.75,13.12&layer=mapnik&marker=${currentCenter.lat},${currentCenter.lng}`}
          />
        </div>
      )}
    </div>
  );
}
