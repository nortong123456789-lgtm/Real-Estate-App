'use client';

import React, { useState } from 'react';
import { APIProvider, Map, Marker, InfoWindow } from '@vis.gl/react-google-maps';
import { Listing } from '@/types';
import { Building, MapPin, Camera, ExternalLink, Layers, X, Navigation, ChevronRight } from 'lucide-react';
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

// Safe Price Formatter for iOS Safari
function formatPrice(amount?: number | string | null): string {
  if (!amount) return '25,000';
  const num = typeof amount === 'number' ? amount : parseFloat(String(amount));
  if (isNaN(num)) return '25,000';
  try {
    return num.toLocaleString('en-IN');
  } catch (e) {
    return String(num);
  }
}

// Haversine Distance Formula in Kilometers
function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export default function MapComponent({
  activeListings = [],
  selectedCoords,
  mapCenter,
  onMapClick,
  onSelectListing,
  apiKey
}: MapComponentProps) {
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [forceOsmFallback, setForceOsmFallback] = useState<boolean>(false);

  const currentCenter = mapCenter || (selectedListing?.latitude && selectedListing?.longitude
    ? { lat: Number(selectedListing.latitude), lng: Number(selectedListing.longitude) }
    : BENGALURU_DEFAULT_CENTER);

  // Dynamic OpenStreetMap Bounding Box around current search/pin location
  const delta = 0.035;
  const osmBbox = `${currentCenter.lng - delta},${currentCenter.lat - delta},${currentCenter.lng + delta},${currentCenter.lat + delta}`;
  const osmEmbedUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${osmBbox}&layer=mapnik&marker=${currentCenter.lat},${currentCenter.lng}`;

  // Calculate nearby listings sorted by spatial distance
  const nearbyListings = (selectedListing?.latitude && selectedListing?.longitude)
    ? activeListings
        .map((item) => ({
          ...item,
          distanceKm: (item.latitude && item.longitude)
            ? calculateDistanceKm(Number(selectedListing.latitude!), Number(selectedListing.longitude!), Number(item.latitude), Number(item.longitude))
            : 999
        }))
        .sort((a, b) => a.distanceKm - b.distanceKm)
    : activeListings;

  // Verify whether the API Key is a real key or placeholder
  const isValidApiKey = Boolean(
    apiKey &&
    apiKey !== 'YOUR_GOOGLE_MAPS_API_KEY' &&
    !apiKey.includes('YOUR_') &&
    apiKey.length > 20
  ) && !forceOsmFallback;

  return (
    <div
      className="w-full h-full min-h-[500px] relative rounded-2xl md:rounded-3xl overflow-hidden border border-slate-200/80 shadow-md bg-slate-100 flex flex-col"
      style={{ width: '100%', height: '100%', minHeight: '500px' }}
    >
      {/* Top Left Floating Map Badge */}
      <div className="absolute top-3 left-3 z-10 bg-white/95 backdrop-blur-md px-3.5 py-2 rounded-2xl border border-slate-200 text-xs font-extrabold text-slate-800 shadow-md flex items-center gap-2">
        <MapPin className="w-4 h-4 text-brand-500 flex-shrink-0" />
        <span>Bengaluru Map ({activeListings.length} Properties)</span>
      </div>

      {/* Top Right Map Engine Toggle Badge */}
      <div className="absolute top-3 right-3 z-10 flex items-center gap-2">
        <button
          onClick={() => setForceOsmFallback(!forceOsmFallback)}
          className="bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-200 text-[11px] font-bold text-slate-700 hover:text-brand-500 shadow-sm flex items-center gap-1.5 transition-all"
        >
          <Layers className="w-3.5 h-3.5 text-brand-500" />
          <span>{forceOsmFallback ? 'Google Maps' : 'OpenStreetMap'}</span>
        </button>
      </div>

      {/* Map View Canvas */}
      <div className="flex-1 w-full relative">
        {isValidApiKey ? (
          <APIProvider apiKey={apiKey}>
            <Map
              defaultCenter={BENGALURU_DEFAULT_CENTER}
              center={currentCenter}
              defaultZoom={12}
              mapId="DEMO_MAP_ID"
              gestureHandling={'greedy'}
              disableDefaultUI={false}
              className="w-full h-full min-h-[450px]"
              style={{ width: '100%', height: '100%', minHeight: '450px' }}
              onClick={(e) => {
                if (e.detail.latLng && onMapClick) {
                  onMapClick({ lat: e.detail.latLng.lat, lng: e.detail.latLng.lng });
                }
              }}
            >
              {/* Active Property Pins in Coral Brand Color */}
              {activeListings.map((listing) => (
                (typeof listing.latitude === 'number' && typeof listing.longitude === 'number') ? (
                  <Marker
                    key={listing.id}
                    position={{ lat: listing.latitude, lng: listing.longitude }}
                    onClick={() => setSelectedListing(listing)}
                    icon={{
                      path: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z',
                      fillColor: selectedListing?.id === listing.id ? '#101828' : '#FF5A3C',
                      fillOpacity: 1,
                      strokeWeight: 2.5,
                      strokeColor: '#FFFFFF',
                      scale: selectedListing?.id === listing.id ? 2.2 : 1.8
                    }}
                  />
                ) : null
              ))}

              {/* Draft Target Selected Pin */}
              {selectedCoords && typeof selectedCoords.lat === 'number' && typeof selectedCoords.lng === 'number' && (
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

              {/* Info Window for Selected Active Listing with iOS Safety Guards */}
              {selectedListing && typeof selectedListing.latitude === 'number' && typeof selectedListing.longitude === 'number' && (
                <InfoWindow
                  position={{ lat: selectedListing.latitude, lng: selectedListing.longitude }}
                  onCloseClick={() => setSelectedListing(null)}
                >
                  <div className="p-1 max-w-[220px] md:max-w-xs font-sans">
                    {selectedListing.media_files?.[0] && (
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
                      ₹{formatPrice(selectedListing.rent_amount)}/mo
                    </div>
                    <div className="text-xs text-slate-500 mb-2 flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      <span>{selectedListing.configuration || 'Bengaluru'}</span>
                    </div>

                    <button
                      onClick={() => {
                        if (onSelectListing) onSelectListing(selectedListing);
                      }}
                      className="w-full mt-2 py-2 px-3 bg-brand-500 hover:bg-brand-600 text-white font-extrabold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition-colors"
                    >
                      <span>View Details</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </InfoWindow>
              )}
            </Map>
          </APIProvider>
        ) : (
          /* Free Dynamic Interactive OpenStreetMap Canvas */
          <iframe
            key={`${currentCenter.lat}-${currentCenter.lng}`}
            title="Bengaluru Property Map"
            width="100%"
            height="100%"
            style={{ border: 0, minHeight: '450px', width: '100%' }}
            loading="lazy"
            src={osmEmbedUrl}
          />
        )}
      </div>

      {/* Floating Bottom Nearby Properties Carousel Drawer */}
      {selectedListing && (
        <div className="bg-white/95 backdrop-blur-md border-t border-slate-200/80 p-3 sm:p-4 shadow-2xl z-20 animate-in slide-in-from-bottom duration-300">
          <div className="max-w-7xl mx-auto">
            {/* Drawer Header */}
            <div className="flex items-center justify-between pb-2.5 mb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Navigation className="w-4 h-4 text-brand-500" />
                <h3 className="text-sm font-extrabold text-slate-900">
                  Nearby Properties
                </h3>
                <span className="bg-brand-50 text-brand-600 text-[10px] font-extrabold px-2 py-0.5 rounded-md border border-brand-100">
                  {nearbyListings.length} Nearby
                </span>
              </div>

              <button
                onClick={() => setSelectedListing(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Nearby Properties Horizontal Carousel */}
            <div className="flex gap-3.5 overflow-x-auto pb-1 scrollbar-thin">
              {nearbyListings.map((item) => {
                const isSelected = item.id === selectedListing.id;
                const mediaUrl = item.media_files?.[0] ? getMediaProxyUrl(item.media_files[0]) : null;

                return (
                  <div
                    key={item.id}
                    onClick={() => setSelectedListing(item)}
                    className={`w-64 sm:w-72 bg-white rounded-2xl border p-3 flex-shrink-0 cursor-pointer transition-all flex gap-3 shadow-xs hover:shadow-md ${
                      isSelected
                        ? 'border-brand-500 ring-2 ring-brand-500/20 bg-brand-50/20'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    {/* Thumbnail Image */}
                    <div className="w-20 h-20 bg-slate-100 rounded-xl overflow-hidden flex-shrink-0 relative">
                      {mediaUrl ? (
                        <img src={mediaUrl} alt="Property" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[10px] text-slate-400 p-1 text-center">
                          Property Photo
                        </div>
                      )}
                      {item.distanceKm !== undefined && item.distanceKm < 900 && (
                        <div className="absolute bottom-1 left-1 right-1 bg-black/70 text-white text-[9px] font-extrabold text-center py-0.5 rounded-md">
                          {item.distanceKm === 0 ? 'Selected' : `${item.distanceKm.toFixed(1)} km`}
                        </div>
                      )}
                    </div>

                    {/* Details Column */}
                    <div className="flex-1 flex flex-col justify-between">
                      <div>
                        <div className="text-brand-500 font-black text-sm">
                          ₹{formatPrice(item.rent_amount)}/mo
                        </div>
                        <div className="text-xs font-bold text-slate-800 line-clamp-1 mt-0.5">
                          {item.configuration || '2 BHK Apartment'}
                        </div>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onSelectListing) onSelectListing(item);
                        }}
                        className="mt-2 w-full py-1.5 bg-slate-900 hover:bg-brand-500 text-white text-[11px] font-extrabold rounded-lg flex items-center justify-center gap-1 transition-colors"
                      >
                        <span>View Details</span>
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
