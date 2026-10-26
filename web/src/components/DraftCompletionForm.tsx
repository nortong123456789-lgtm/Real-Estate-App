'use client';

import React, { useState, useEffect } from 'react';
import { Listing, DraftUpdatePayload } from '@/types';
import { getMediaProxyUrl } from '@/lib/api';
import {
  X, Check, MapPin, Building2, IndianRupee, Image as ImageIcon,
  Search, Navigation, Edit3, Eye, ChevronLeft, ChevronRight, Phone, Trash2
} from 'lucide-react';

interface PropertyModalProps {
  property: Listing;
  selectedCoords: { lat: number; lng: number } | null;
  onClose: () => void;
  onSubmit: (payload: DraftUpdatePayload) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  initialEditMode?: boolean;
}

export default function DraftCompletionForm({
  property,
  selectedCoords,
  onClose,
  onSubmit,
  onDelete,
  initialEditMode = false
}: PropertyModalProps) {
  // Early return if property object is undefined
  if (!property) return null;

  const isDraft = property?.status === 'draft';
  const [isEditMode, setIsEditMode] = useState<boolean>(initialEditMode || isDraft);

  // Active Photo Index in Gallery Carousel
  const [activeMediaIndex, setActiveMediaIndex] = useState<number>(0);

  // Form Fields - Pre-populate with existing property values or defaults
  const [configuration, setConfiguration] = useState<string>(property?.configuration || '2 BHK');
  const [rentAmount, setRentAmount] = useState<number | ''>(property?.rent_amount ?? 25000);
  const [neighborhood, setNeighborhood] = useState<string>(property?.neighborhood || 'Indiranagar');
  const [searchAddress, setSearchAddress] = useState<string>('');
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [searchFeedback, setSearchFeedback] = useState<string | null>(null);

  const [latitude, setLatitude] = useState<number>(
    property?.latitude || selectedCoords?.lat || 12.9716
  );
  const [longitude, setLongitude] = useState<number>(
    property?.longitude || selectedCoords?.lng || 77.5946
  );

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const mediaFiles = property?.media_files || [];

  // Sync state when property or selectedCoords changes
  useEffect(() => {
    if (property) {
      setConfiguration(property.configuration || '2 BHK');
      setRentAmount(property.rent_amount ?? 25000);
      setNeighborhood(property.neighborhood || 'Indiranagar');
      if (property.latitude && property.longitude) {
        setLatitude(property.latitude);
        setLongitude(property.longitude);
      }
    }
  }, [property]);

  useEffect(() => {
    if (selectedCoords) {
      setLatitude(selectedCoords.lat);
      setLongitude(selectedCoords.lng);
    }
  }, [selectedCoords]);

  // Handle Location / Address Search with Google Geocoder & OpenStreetMap Fallback
  const handleSearchLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchAddress.trim()) return;

    setIsSearching(true);
    setSearchFeedback(null);

    const query = searchAddress.toLowerCase().includes('bengaluru') || searchAddress.toLowerCase().includes('bangalore')
      ? searchAddress
      : `${searchAddress}, Bengaluru, Karnataka`;

    let geocoded = false;

    // Attempt 1: Google Maps Geocoder if loaded
    if (typeof window !== 'undefined' && window.google && window.google.maps && window.google.maps.Geocoder) {
      try {
        const geocoder = new window.google.maps.Geocoder();
        await new Promise<void>((resolve) => {
          geocoder.geocode({ address: query }, (results, status) => {
            if (status === 'OK' && results && results[0]) {
              const location = results[0].geometry.location;
              const newLat = location.lat();
              const newLng = location.lng();

              setLatitude(newLat);
              setLongitude(newLng);

              const formattedAddr = results[0].formatted_address;
              const localityComponent = results[0].address_components?.find(
                comp => comp.types.includes('sublocality') || comp.types.includes('locality')
              );

              if (localityComponent) {
                setNeighborhood(localityComponent.long_name);
              } else {
                setNeighborhood(searchAddress.split(',')[0]);
              }

              setSearchFeedback(`Pin placed at: ${formattedAddr.split(',')[0]}`);
              geocoded = true;
            }
            resolve();
          });
        });
      } catch (err) {
        console.warn('Google Geocoder failed, trying fallback...', err);
      }
    }

    // Attempt 2: Free OpenStreetMap Nominatim Fallback if Google Geocoder failed or not loaded
    if (!geocoded) {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`
        );
        if (res.ok) {
          const data = await res.json();
          if (data && data.length > 0) {
            const result = data[0];
            const newLat = parseFloat(result.lat);
            const newLng = parseFloat(result.lon);

            setLatitude(newLat);
            setLongitude(newLng);

            const name = result.display_name.split(',')[0];
            setNeighborhood(name || searchAddress);
            setSearchFeedback(`Pin placed at: ${name}`);
            geocoded = true;
          }
        }
      } catch (err) {
        console.warn('Nominatim geocoder error:', err);
      }
    }

    setIsSearching(false);

    if (!geocoded) {
      setSearchFeedback('Location not found. Click directly on the map to set pin.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rentAmount || !configuration || !neighborhood) return;

    setIsSubmitting(true);
    try {
      await onSubmit({
        configuration,
        rent_amount: Number(rentAmount),
        neighborhood,
        latitude,
        longitude,
        status: 'active'
      });
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentMedia = mediaFiles[activeMediaIndex];
  const currentMediaUrl = currentMedia ? getMediaProxyUrl(currentMedia) : null;

  return (
    <div className="fixed inset-0 bg-darkNav/70 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-t-3xl sm:rounded-3xl max-w-xl w-full p-5 sm:p-7 shadow-2xl border border-slate-100 max-h-[92vh] overflow-y-auto">

        {/* Top Header Bar */}
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span
              className={`text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-md border ${
                isDraft
                  ? 'bg-amber-50 text-amber-600 border-amber-200'
                  : 'bg-emerald-50 text-emerald-600 border-emerald-200'
              }`}
            >
              {isDraft ? 'Pending Draft' : 'Active Property'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Delete Listing Button */}
            {onDelete && (
              <button
                onClick={async () => {
                  if (confirm('Are you sure you want to delete this property listing?')) {
                    await onDelete(property.id);
                    onClose();
                  }
                }}
                className="p-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-full transition-colors"
                title="Delete Property"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            )}

            {/* Toggle Edit Button on Top Bar */}
            <button
              onClick={() => setIsEditMode(!isEditMode)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 hover:border-brand-500 text-xs font-bold text-slate-700 hover:text-brand-500 bg-slate-50 transition-all"
            >
              {isEditMode ? (
                <>
                  <Eye className="w-3.5 h-3.5" />
                  <span>View Details</span>
                </>
              ) : (
                <>
                  <Edit3 className="w-3.5 h-3.5 text-brand-500" />
                  <span>Edit Property</span>
                </>
              )}
            </button>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ----------------- MODE 1: VIEW DETAILS MODE ----------------- */}
        {!isEditMode ? (
          <div className="space-y-5">
            {/* Photo Gallery Carousel / Showcase */}
            <div className="relative w-full h-64 sm:h-72 bg-slate-900 rounded-2xl overflow-hidden group shadow-md">
              {currentMediaUrl ? (
                currentMedia?.file_type.startsWith('video') ? (
                  <video
                    src={currentMediaUrl}
                    className="w-full h-full object-cover"
                    controls
                  />
                ) : (
                  <img
                    src={currentMediaUrl}
                    alt={property.configuration || 'Property'}
                    className="w-full h-full object-cover"
                  />
                )
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 p-4 text-center">
                  <ImageIcon className="w-10 h-10 mb-2 opacity-40 text-brand-500" />
                  <span className="text-xs font-medium">No photo available</span>
                </div>
              )}

              {/* Gallery Navigation Controls */}
              {mediaFiles.length > 1 && (
                <>
                  <button
                    onClick={() =>
                      setActiveMediaIndex(
                        (prev) => (prev - 1 + mediaFiles.length) % mediaFiles.length
                      )
                    }
                    className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-all"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() =>
                      setActiveMediaIndex((prev) => (prev + 1) % mediaFiles.length)
                    }
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-all"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>

                  <div className="absolute bottom-3 right-3 bg-black/60 backdrop-blur-xs text-white text-[11px] font-bold px-2.5 py-1 rounded-md">
                    {activeMediaIndex + 1} / {mediaFiles.length} Photos
                  </div>
                </>
              )}
            </div>

            {/* Thumbnail selector row */}
            {mediaFiles.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
                {mediaFiles.map((media, idx) => {
                  const thumbUrl = getMediaProxyUrl(media);
                  return (
                    <button
                      key={media.id || idx}
                      onClick={() => setActiveMediaIndex(idx)}
                      className={`w-16 h-16 rounded-xl border-2 overflow-hidden flex-shrink-0 transition-all ${
                        activeMediaIndex === idx ? 'border-brand-500 scale-105' : 'border-slate-200 opacity-60'
                      }`}
                    >
                      {thumbUrl ? (
                        <img src={thumbUrl} alt="Thumb" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-slate-100 flex items-center justify-center text-[10px] text-slate-400">
                          #{idx + 1}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Property Key Details */}
            <div>
              <div className="flex items-baseline gap-1 text-brand-500 font-black text-2xl mb-1">
                <span>₹{property.rent_amount ? property.rent_amount.toLocaleString('en-IN') : '25,000'}</span>
                <span className="text-xs font-semibold text-slate-400">/month</span>
              </div>

              <h2 className="text-xl font-extrabold text-slate-900 mb-1">
                {property.configuration || '2 BHK'} Apartment in {property.neighborhood || 'Bengaluru'}
              </h2>

              <p className="text-xs text-slate-500 flex items-center gap-1.5 mb-4">
                <MapPin className="w-4 h-4 text-brand-500 flex-shrink-0" />
                <span>{property.neighborhood || 'Bengaluru, Karnataka'}</span>
              </p>

              {/* Specs Cards */}
              <div className="grid grid-cols-3 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-100 text-center text-xs">
                <div>
                  <span className="block font-black text-slate-900 text-sm">{property.configuration || '2 BHK'}</span>
                  <span className="text-[10px] text-slate-400 uppercase font-extrabold">Configuration</span>
                </div>
                <div className="border-x border-slate-200">
                  <span className="block font-black text-slate-900 text-sm">2 Baths</span>
                  <span className="text-[10px] text-slate-400 uppercase font-extrabold">Bathrooms</span>
                </div>
                <div>
                  <span className="block font-black text-slate-900 text-sm">1,250</span>
                  <span className="text-[10px] text-slate-400 uppercase font-extrabold">Sq Ft</span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setIsEditMode(true)}
                className="flex-1 py-3.5 px-4 rounded-xl border border-slate-200 text-slate-700 font-bold text-sm hover:bg-slate-50 flex items-center justify-center gap-2 transition-colors"
              >
                <Edit3 className="w-4 h-4 text-brand-500" />
                <span>Edit Property</span>
              </button>

              <button
                onClick={() => alert('Agent Contacted! Calling partner...')}
                className="flex-1 py-3.5 px-4 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-brand-500/25 transition-all"
              >
                <Phone className="w-4 h-4" />
                <span>Contact Partner</span>
              </button>
            </div>
          </div>
        ) : (
          /* ----------------- MODE 2: EDIT PROPERTY MODE ----------------- */
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Real Media Preview Section */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4 text-brand-500" />
                <span>Property Media ({mediaFiles.length} items)</span>
              </label>
              <div className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-thin">
                {mediaFiles.length > 0 ? (
                  mediaFiles.map((media, idx) => {
                    const mediaUrl = getMediaProxyUrl(media);
                    return (
                      <div
                        key={media.id || idx}
                        className="w-20 h-20 bg-slate-100 border border-slate-200 rounded-2xl flex-shrink-0 relative overflow-hidden shadow-xs group"
                      >
                        {mediaUrl ? (
                          media.file_type.startsWith('video') ? (
                            <video
                              src={mediaUrl}
                              className="w-full h-full object-cover"
                              controls={false}
                            />
                          ) : (
                            <img
                              src={mediaUrl}
                              alt={media.original_filename || `Media ${idx + 1}`}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                            />
                          )
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xs text-slate-400 p-2 text-center">
                            {media.original_filename || `File ${idx + 1}`}
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div className="text-xs text-slate-400 italic">No media attached</div>
                )}
              </div>
            </div>

            {/* Location Search Bar with Dual Geocoding Engine */}
            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200/80">
              <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <Navigation className="w-3.5 h-3.5 text-brand-500" />
                  <span>Search Location / Landmark</span>
                </span>
                <span className="text-[10px] text-slate-400 font-normal">Auto-places map pin</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={searchAddress}
                  onChange={(e) => setSearchAddress(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleSearchLocation(e);
                    }
                  }}
                  placeholder="e.g. Koramangala 5th Block, MG Road..."
                  className="flex-1 px-3.5 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 text-xs font-medium text-slate-800 bg-white"
                />
                <button
                  type="button"
                  onClick={handleSearchLocation}
                  disabled={isSearching}
                  className="px-3.5 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-xl font-bold text-xs flex items-center gap-1 shadow-xs transition-all"
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>{isSearching ? 'Finding...' : 'Find'}</span>
                </button>
              </div>
              {searchFeedback && (
                <p className="text-[11px] font-medium text-brand-600 mt-1.5 flex items-center gap-1">
                  <Check className="w-3 h-3" />
                  <span>{searchFeedback}</span>
                </p>
              )}
            </div>

            {/* Edit Fields */}
            <div>
              <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5 text-brand-500" />
                <span>Configuration</span>
              </label>
              <select
                value={configuration}
                onChange={(e) => setConfiguration(e.target.value)}
                className="w-full px-4 py-2.5 sm:py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 text-sm font-semibold text-slate-800 bg-slate-50/50"
              >
                <option value="1 BHK">1 BHK Apartment</option>
                <option value="2 BHK">2 BHK Apartment</option>
                <option value="3 BHK">3 BHK Apartment</option>
                <option value="4+ BHK">4+ BHK / Luxury Villa</option>
                <option value="Studio">Studio Apartment</option>
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1">
                  <IndianRupee className="w-3.5 h-3.5 text-brand-500" />
                  <span>Monthly Rent (₹)</span>
                </label>
                <input
                  type="number"
                  value={rentAmount}
                  onChange={(e) => setRentAmount(e.target.value ? Number(e.target.value) : '')}
                  placeholder="25000"
                  required
                  className="w-full px-4 py-2.5 sm:py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 text-sm font-semibold text-slate-800 bg-slate-50/50"
                />
              </div>

              <div>
                <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-brand-500" />
                  <span>Neighborhood</span>
                </label>
                <input
                  type="text"
                  value={neighborhood}
                  onChange={(e) => setNeighborhood(e.target.value)}
                  placeholder="Indiranagar, Koramangala..."
                  required
                  className="w-full px-4 py-2.5 sm:py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 text-sm font-semibold text-slate-800 bg-slate-50/50"
                />
              </div>
            </div>

            {/* Location Pin Coords */}
            <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-200/80 text-xs text-slate-600">
              <span className="font-extrabold text-slate-800 block mb-0.5">Current Pin Coords (Click Map to relocate):</span>
              <div className="flex justify-between font-mono text-slate-700 text-[11px]">
                <span>Lat: {latitude.toFixed(4)}</span>
                <span>Lng: {longitude.toFixed(4)}</span>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsEditMode(false)}
                className="flex-1 py-3 px-4 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 py-3 px-4 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-brand-500/25 transition-all"
              >
                <Check className="w-4 h-4" />
                <span>{isSubmitting ? 'Publishing...' : 'Publish / Save Changes'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
