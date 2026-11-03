'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Search, User, PlusCircle, Home, X, Navigation, ShieldCheck, LogOut, Sparkles, MapPin, Clock } from 'lucide-react';
import { HeaderProps } from '@/types';

interface SuggestionItem {
  place_id: string | number;
  main_text: string;
  secondary_text?: string;
  display_name: string;
  lat?: string;
  lon?: string;
  isGooglePlace?: boolean;
}

// Popular Bengaluru Landmarks
const POPULAR_BENGALURU_LOCATIONS: SuggestionItem[] = [
  { place_id: 'bgl_1', main_text: 'Koramangala', secondary_text: 'Bengaluru, Karnataka', display_name: 'Koramangala, Bengaluru', lat: '12.9352', lon: '77.6245' },
  { place_id: 'bgl_2', main_text: 'Indiranagar', secondary_text: 'Bengaluru, Karnataka', display_name: 'Indiranagar, Bengaluru', lat: '12.9784', lon: '77.6408' },
  { place_id: 'bgl_3', main_text: 'HSR Layout', secondary_text: 'Bengaluru, Karnataka', display_name: 'HSR Layout, Bengaluru', lat: '12.9116', lon: '77.6388' },
  { place_id: 'bgl_4', main_text: 'Whitefield', secondary_text: 'Bengaluru, Karnataka', display_name: 'Whitefield, Bengaluru', lat: '12.9696', lon: '77.7497' },
  { place_id: 'bgl_5', main_text: 'Electronic City Phase 1', secondary_text: 'Bengaluru, Karnataka', display_name: 'Electronic City Phase 1, Bengaluru', lat: '12.8452', lon: '77.6602' },
  { place_id: 'bgl_6', main_text: 'JP Nagar Phase 6', secondary_text: 'Bengaluru, Karnataka', display_name: 'JP Nagar Phase 6, Bengaluru', lat: '12.9063', lon: '77.5857' }
];

export default function Header({
  draftsCount,
  isAdmin = false,
  onOpenDrafts,
  onOpenLoginModal,
  onLogout,
  onSearchQuery
}: HeaderProps) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<SuggestionItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Google Places Autocomplete Session Token
  const sessionTokenRef = useRef<any>(null);

  const getOrCreateSessionToken = () => {
    if (typeof window !== 'undefined' && window.google && window.google.maps && window.google.maps.places) {
      if (!sessionTokenRef.current && window.google.maps.places.AutocompleteSessionToken) {
        sessionTokenRef.current = new window.google.maps.places.AutocompleteSessionToken();
      }
    }
    return sessionTokenRef.current;
  };

  // Google Places + Nominatim Autocomplete Engine with Native Google Maps Dropdown Layout
  useEffect(() => {
    if (!query.trim()) {
      setSuggestions(POPULAR_BENGALURU_LOCATIONS.slice(0, 5));
      return;
    }

    const directActionItem: SuggestionItem = {
      place_id: `search_${Date.now()}`,
      main_text: query,
      secondary_text: 'Search map location',
      display_name: query,
      isGooglePlace: true
    };

    // 1. Instant Local Match (0ms)
    const localMatches = POPULAR_BENGALURU_LOCATIONS.filter((item) =>
      item.display_name.toLowerCase().includes(query.toLowerCase())
    );

    setSuggestions([directActionItem, ...localMatches]);
    setShowDropdown(true);

    const timer = setTimeout(() => {
      setIsLoading(true);
      const token = getOrCreateSessionToken();

      // Attempt A: Google Places Autocomplete Service (Exact Google Maps Parity)
      if (typeof window !== 'undefined' && window.google && window.google.maps && window.google.maps.places) {
        try {
          const service = new window.google.maps.places.AutocompleteService();
          const requestOptions: any = {
            input: query,
            locationBias: {
              center: { lat: 12.9716, lng: 77.5946 },
              radius: 50000 // 50 km Bengaluru radius
            },
            language: 'en',
            region: 'in',
            componentRestrictions: { country: 'in' }
          };

          if (token) {
            requestOptions.sessionToken = token;
          }

          service.getPlacePredictions(requestOptions, (predictions, status) => {
            if (status === window.google.maps.places.PlacesServiceStatus.OK && predictions) {
              const googleResults: SuggestionItem[] = predictions.map((p) => ({
                place_id: p.place_id,
                main_text: p.structured_formatting?.main_text || p.description.split(',')[0],
                secondary_text: p.structured_formatting?.secondary_text || p.description.split(',').slice(1).join(','),
                display_name: p.description,
                isGooglePlace: true
              }));
              setSuggestions([directActionItem, ...googleResults.slice(0, 5)]);
              setShowDropdown(true);
              setIsLoading(false);
              return;
            }
          });
        } catch (err) {
          console.warn('Google Places autocomplete failed, falling back to Nominatim', err);
        }
      }

      // Attempt B: OpenStreetMap Nominatim Fallback
      const searchQueryFormatted = query.toLowerCase().includes('bengaluru') || query.toLowerCase().includes('bangalore')
        ? query
        : `${query}, Bengaluru`;

      fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQueryFormatted)}&limit=5`)
        .then((res) => (res.ok ? res.json() : []))
        .then((data: any[]) => {
          if (data && data.length > 0) {
            const mappedData: SuggestionItem[] = data.map((d) => ({
              place_id: d.place_id,
              main_text: d.display_name.split(',')[0],
              secondary_text: d.display_name.split(',').slice(1).join(','),
              display_name: d.display_name,
              lat: d.lat,
              lon: d.lon
            }));
            const combined = [directActionItem, ...mappedData, ...localMatches];
            const unique = combined.filter(
              (v, i, a) => a.findIndex((t) => t.display_name.split(',')[0] === v.display_name.split(',')[0]) === i
            );
            setSuggestions(unique.slice(0, 6));
            setShowDropdown(true);
          }
        })
        .catch((err) => console.warn(err))
        .finally(() => setIsLoading(false));
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectSuggestion = (item: SuggestionItem) => {
    const cleanName = item.main_text || item.display_name.split(',')[0];
    setQuery(cleanName);
    setShowDropdown(false);
    sessionTokenRef.current = null;

    // If Google Place ID, resolve exact lat/lng via Geocoder
    if (item.isGooglePlace && typeof window !== 'undefined' && window.google && window.google.maps && window.google.maps.Geocoder) {
      const geocoder = new window.google.maps.Geocoder();
      const geocodeTarget = String(item.place_id).startsWith('search_')
        ? { address: `${cleanName}, Bengaluru, Karnataka` }
        : { placeId: String(item.place_id) };

      geocoder.geocode(geocodeTarget, (results, status) => {
        if (status === 'OK' && results && results[0]) {
          const loc = results[0].geometry.location;
          if (onSearchQuery) {
            onSearchQuery(cleanName, { lat: loc.lat(), lng: loc.lng() });
          }
        } else if (onSearchQuery) {
          onSearchQuery(cleanName);
        }
      });
      return;
    }

    if (item.lat && item.lon && onSearchQuery) {
      onSearchQuery(cleanName, {
        lat: parseFloat(item.lat),
        lng: parseFloat(item.lon)
      });
    } else if (onSearchQuery) {
      onSearchQuery(cleanName);
    }
  };

  const handleInputChange = (value: string) => {
    setQuery(value);
    setShowDropdown(true);
    if (onSearchQuery) {
      onSearchQuery(value);
    }
  };

  const handleClear = () => {
    setQuery('');
    setSuggestions(POPULAR_BENGALURU_LOCATIONS.slice(0, 5));
    setShowDropdown(false);
    sessionTokenRef.current = null;
    if (onSearchQuery) {
      onSearchQuery('');
    }
  };

  return (
    <header className="w-full flex-shrink-0 z-30 shadow-2xs bg-white">
      {/* Compact Responsive Navbar */}
      <div className="px-3 sm:px-6 py-2 border-b border-slate-100 flex items-center justify-between gap-2 max-w-7xl mx-auto">
        {/* Brand Logo - ApnaGhar / Living Spaces */}
        <div className="flex items-center gap-2 cursor-pointer flex-shrink-0">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-brand-500 text-white flex items-center justify-center font-black text-lg shadow-sm shadow-brand-500/20">
            <Home className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
          </div>
          <div>
            <div className="flex items-baseline">
              <span className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">ApnaGhar</span>
            </div>
            <p className="text-[8px] sm:text-[9px] text-brand-500 font-extrabold -mt-1 tracking-wider uppercase">Living Spaces</p>
          </div>
        </div>

        {/* Compact Floating Pill Search Bar */}
        <div ref={dropdownRef} className="flex-1 max-w-md mx-1 relative">
          <div className="relative w-full">
            <div className="flex items-center bg-white border border-slate-300 rounded-full px-3 py-1.5 shadow-2xs hover:border-slate-400 focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-500/20 transition-all">
              <Search className="w-3.5 h-3.5 text-slate-400 mr-1.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <input
                  type="text"
                  value={query}
                  onChange={(e) => handleInputChange(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && query.trim()) {
                      e.preventDefault();
                      handleSelectSuggestion({
                        place_id: `search_enter_${Date.now()}`,
                        main_text: query,
                        display_name: query,
                        isGooglePlace: true
                      });
                    }
                  }}
                  onFocus={() => {
                    getOrCreateSessionToken();
                    if (suggestions.length === 0) setSuggestions(POPULAR_BENGALURU_LOCATIONS.slice(0, 5));
                    setShowDropdown(true);
                  }}
                  placeholder="Where to? Search house, landmark, building..."
                  className="w-full text-xs font-semibold text-slate-800 bg-transparent focus:outline-none placeholder:text-slate-500 truncate"
                />
              </div>

              {query ? (
                <button onClick={handleClear} className="p-0.5 text-slate-400 hover:text-slate-600 rounded-full ml-1">
                  <X className="w-3 h-3" />
                </button>
              ) : (
                <div className="w-6 h-6 bg-black text-white rounded-full flex items-center justify-center ml-1 flex-shrink-0">
                  <Search className="w-3 h-3" />
                </div>
              )}
            </div>
          </div>

          {/* Google Maps Styled Dropdown List */}
          {showDropdown && (
            <div className="absolute top-full left-0 right-0 mt-1.5 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="px-3.5 py-2 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                <span className="flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-brand-500" />
                  <span>Google Maps Location Search</span>
                </span>
                {isLoading && <span className="text-brand-500 animate-pulse">Searching...</span>}
              </div>
              <div className="max-h-64 overflow-y-auto divide-y divide-slate-100">
                {suggestions.map((item) => (
                  <button
                    key={item.place_id}
                    onClick={() => handleSelectSuggestion(item)}
                    className="w-full text-left px-4 py-3 hover:bg-slate-50 flex items-start gap-3 transition-colors group"
                  >
                    <MapPin className="w-4 h-4 text-slate-400 group-hover:text-brand-500 flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-slate-900 group-hover:text-brand-600 truncate">
                        {item.main_text || item.display_name.split(',')[0]}
                      </p>
                      {item.secondary_text && (
                        <p className="text-[10px] text-slate-500 font-medium truncate mt-0.5">
                          {item.secondary_text}
                        </p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {/* Drafts Queue - Visible ONLY to Admin */}
          {isAdmin && (
            <button
              onClick={onOpenDrafts}
              className="hidden sm:flex bg-amber-50 text-amber-700 hover:bg-amber-100 font-bold text-xs px-3 py-1.5 rounded-full items-center gap-1 transition-all border border-amber-200"
            >
              <PlusCircle className="w-3.5 h-3.5 text-amber-600" />
              <span>Drafts ({draftsCount})</span>
            </button>
          )}

          {/* Login / Admin Status Action */}
          {isAdmin ? (
            <div className="flex items-center gap-1">
              <span className="bg-emerald-50 border border-emerald-200 text-emerald-700 font-extrabold text-[11px] px-3 py-1.5 rounded-full flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Admin</span>
              </span>
              <button
                onClick={onLogout}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
                title="Log Out Admin"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenLoginModal}
              className="bg-brand-500 hover:bg-brand-600 text-white font-extrabold text-xs px-3.5 py-1.5 rounded-full flex items-center gap-1 shadow-2xs transition-all"
            >
              <User className="w-3.5 h-3.5" />
              <span>Log In</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
