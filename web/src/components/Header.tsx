'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Search, User, PlusCircle, Home, X, Navigation, ShieldCheck, LogOut, Sparkles, MapPin } from 'lucide-react';
import { HeaderProps } from '@/types';

interface SuggestionItem {
  place_id: string | number;
  main_text: string;
  secondary_text?: string;
  display_name: string;
  lat?: number;
  lng?: number;
  isGooglePlace?: boolean;
}

// Popular Bengaluru Landmarks
const POPULAR_BENGALURU_LOCATIONS: SuggestionItem[] = [
  { place_id: 'bgl_1', main_text: 'Koramangala', secondary_text: 'Bengaluru, Karnataka', display_name: 'Koramangala, Bengaluru', lat: 12.9352, lng: 77.6245 },
  { place_id: 'bgl_2', main_text: 'Indiranagar', secondary_text: 'Bengaluru, Karnataka', display_name: 'Indiranagar, Bengaluru', lat: 12.9784, lng: 77.6408 },
  { place_id: 'bgl_3', main_text: 'HSR Layout', secondary_text: 'Bengaluru, Karnataka', display_name: 'HSR Layout, Bengaluru', lat: 12.9116, lng: 77.6388 },
  { place_id: 'bgl_4', main_text: 'Whitefield', secondary_text: 'Bengaluru, Karnataka', display_name: 'Whitefield, Bengaluru', lat: 12.9696, lng: 77.7497 },
  { place_id: 'bgl_5', main_text: 'Electronic City Phase 1', secondary_text: 'Bengaluru, Karnataka', display_name: 'Electronic City Phase 1, Bengaluru', lat: 12.8452, lng: 77.6602 },
  { place_id: 'bgl_6', main_text: 'JP Nagar Phase 6', secondary_text: 'Bengaluru, Karnataka', display_name: 'JP Nagar Phase 6, Bengaluru', lat: 12.9063, lng: 77.5857 }
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

  // Autocomplete Engine supporting Google Places API + Nominatim
  useEffect(() => {
    if (!query.trim()) {
      setSuggestions(POPULAR_BENGALURU_LOCATIONS.slice(0, 5));
      return;
    }

    const cleanQ = query.trim();
    const localMatches = POPULAR_BENGALURU_LOCATIONS.filter((item) =>
      item.display_name.toLowerCase().includes(cleanQ.toLowerCase())
    );

    const directActionItem: SuggestionItem = {
      place_id: `search_${Date.now()}`,
      main_text: cleanQ,
      secondary_text: 'Search map location',
      display_name: cleanQ,
      isGooglePlace: true
    };

    setSuggestions([directActionItem, ...localMatches]);
    setShowDropdown(true);

    const timer = setTimeout(() => {
      setIsLoading(true);

      // Attempt 1: Google Geocoder API
      if (typeof window !== 'undefined' && window.google && window.google.maps && window.google.maps.Geocoder) {
        try {
          const geocoder = new window.google.maps.Geocoder();
          const formattedSearch = cleanQ.toLowerCase().includes('bengaluru') || cleanQ.toLowerCase().includes('bangalore')
            ? cleanQ
            : `${cleanQ}, Bengaluru, Karnataka`;

          geocoder.geocode(
            {
              address: formattedSearch,
              bounds: { north: 13.2500, south: 12.7000, east: 77.8500, west: 77.3500 }
            },
            (results, status) => {
              if (status === 'OK' && results && results.length > 0) {
                const googleResults: SuggestionItem[] = results.map((r, idx) => {
                  const parts = r.formatted_address.split(',');
                  const mainText = parts[0].trim();
                  const secondaryText = parts.slice(1, 3).join(',').trim();
                  const loc = r.geometry.location;
                  return {
                    place_id: `geo_${idx}_${Date.now()}`,
                    main_text: mainText,
                    secondary_text: secondaryText,
                    display_name: r.formatted_address,
                    lat: loc.lat(),
                    lng: loc.lng(),
                    isGooglePlace: true
                  };
                });

                setSuggestions(googleResults.slice(0, 5));
                setShowDropdown(true);
                setIsLoading(false);
                return;
              }
            }
          );
        } catch (err) {
          console.warn('Google Geocoder failed, falling back to Nominatim', err);
        }
      }

      // Attempt 2: OpenStreetMap Nominatim Fallback
      const searchQueryFormatted = cleanQ.toLowerCase().includes('bengaluru') || cleanQ.toLowerCase().includes('bangalore')
        ? cleanQ
        : `${cleanQ}, Bengaluru`;

      fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQueryFormatted)}&limit=5`)
        .then((res) => (res.ok ? res.json() : []))
        .then((data: any[]) => {
          if (data && data.length > 0) {
            const mappedData: SuggestionItem[] = data.map((d) => ({
              place_id: d.place_id,
              main_text: d.display_name.split(',')[0],
              secondary_text: d.display_name.split(',').slice(1).join(','),
              display_name: d.display_name,
              lat: parseFloat(d.lat),
              lng: parseFloat(d.lon)
            }));
            const combined = [...mappedData, ...localMatches];
            setSuggestions(combined.slice(0, 5));
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

    if (item.lat && item.lng && onSearchQuery) {
      onSearchQuery(cleanName, { lat: item.lat, lng: item.lng });
      return;
    }

    if (typeof window !== 'undefined' && window.google && window.google.maps && window.google.maps.Geocoder) {
      const geocoder = new window.google.maps.Geocoder();
      geocoder.geocode(
        {
          address: `${cleanName}, Bengaluru, Karnataka`,
          bounds: { north: 13.2500, south: 12.7000, east: 77.8500, west: 77.3500 }
        },
        (results, status) => {
          if (status === 'OK' && results && results[0]) {
            const loc = results[0].geometry.location;
            if (onSearchQuery) {
              onSearchQuery(cleanName, { lat: loc.lat(), lng: loc.lng() });
            }
          } else if (onSearchQuery) {
            onSearchQuery(cleanName);
          }
        }
      );
      return;
    }

    if (onSearchQuery) {
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
    if (onSearchQuery) {
      onSearchQuery('');
    }
  };

  return (
    <header className="w-full flex-shrink-0 z-30 shadow-2xs bg-white">
      {/* Mobile-Friendly Full-Width Search Header */}
      <div className="px-3 sm:px-6 py-2.5 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-2.5 max-w-7xl mx-auto">
        <div className="w-full sm:w-auto flex items-center justify-between">
          {/* Brand Logo */}
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

          {/* Right Actions for Mobile view */}
          <div className="flex sm:hidden items-center gap-1.5">
            {isAdmin && (
              <button
                onClick={onOpenDrafts}
                className="bg-amber-50 text-amber-700 font-bold text-xs px-2.5 py-1.5 rounded-full flex items-center gap-1 border border-amber-200"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>{draftsCount}</span>
              </button>
            )}
            {isAdmin ? (
              <button onClick={onLogout} className="bg-emerald-50 text-emerald-700 font-extrabold text-xs px-3 py-1.5 rounded-full">
                Admin
              </button>
            ) : (
              <button onClick={onOpenLoginModal} className="bg-brand-500 text-white font-extrabold text-xs px-3 py-1.5 rounded-full">
                Log In
              </button>
            )}
          </div>
        </div>

        {/* Full-Width Mobile-Friendly Search Bar */}
        <div ref={dropdownRef} className="w-full sm:flex-1 sm:max-w-xl mx-0 relative">
          <div className="relative w-full">
            <div className="flex items-center bg-slate-50 sm:bg-white border border-slate-300 rounded-full px-4 py-2 sm:py-1.5 shadow-2xs hover:border-slate-400 focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-500/20 transition-all w-full">
              <Search className="w-4 h-4 text-slate-400 mr-2 flex-shrink-0" />
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
                        main_text: query.trim(),
                        display_name: query.trim(),
                        isGooglePlace: true
                      });
                    }
                  }}
                  onFocus={() => {
                    if (suggestions.length === 0) setSuggestions(POPULAR_BENGALURU_LOCATIONS.slice(0, 5));
                    setShowDropdown(true);
                  }}
                  placeholder="Where to? Search house, landmark, area..."
                  className="w-full text-xs sm:text-sm font-semibold text-slate-800 bg-transparent focus:outline-none placeholder:text-slate-400 truncate"
                />
              </div>

              {query ? (
                <button onClick={handleClear} className="p-1 text-slate-400 hover:text-slate-600 rounded-full ml-1">
                  <X className="w-3.5 h-3.5" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    if (query.trim()) {
                      handleSelectSuggestion({
                        place_id: `search_btn_${Date.now()}`,
                        main_text: query.trim(),
                        display_name: query.trim(),
                        isGooglePlace: true
                      });
                    }
                  }}
                  className="w-7 h-7 bg-black text-white rounded-full flex items-center justify-center ml-1 flex-shrink-0 cursor-pointer"
                >
                  <Search className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Location Suggestions Dropdown */}
          {showDropdown && (
            <div className="absolute top-full left-0 right-0 mt-1.5 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="px-3.5 py-2 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                <span className="flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-brand-500" />
                  <span>Location Suggestions</span>
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
                      <p className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-brand-600 truncate">
                        {item.main_text || item.display_name.split(',')[0]}
                      </p>
                      {item.secondary_text && (
                        <p className="text-[10px] sm:text-xs text-slate-500 font-medium truncate mt-0.5">
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

        {/* Desktop Right Actions */}
        <div className="hidden sm:flex items-center gap-2 flex-shrink-0">
          {isAdmin && (
            <button
              onClick={onOpenDrafts}
              className="bg-amber-50 text-amber-700 hover:bg-amber-100 font-bold text-xs px-3.5 py-2 rounded-full flex items-center gap-1.5 transition-all border border-amber-200"
            >
              <PlusCircle className="w-4 h-4 text-amber-600" />
              <span>Drafts ({draftsCount})</span>
            </button>
          )}

          {isAdmin ? (
            <div className="flex items-center gap-1.5">
              <span className="bg-emerald-50 border border-emerald-200 text-emerald-700 font-extrabold text-xs px-3.5 py-2 rounded-full flex items-center gap-1">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
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
              className="bg-brand-500 hover:bg-brand-600 text-white font-extrabold text-xs px-4 py-2 rounded-full flex items-center gap-1.5 shadow-2xs transition-all"
            >
              <User className="w-4 h-4" />
              <span>Log In</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
