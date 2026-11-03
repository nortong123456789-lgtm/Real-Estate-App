'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Search, User, PlusCircle, Home, X, Navigation, ShieldCheck, LogOut, Sparkles, MapPin } from 'lucide-react';
import { HeaderProps } from '@/types';

interface SuggestionItem {
  place_id: string | number;
  display_name: string;
  lat?: string;
  lon?: string;
  isGooglePlace?: boolean;
}

// Popular Bengaluru Landmarks
const POPULAR_BENGALURU_LOCATIONS: SuggestionItem[] = [
  { place_id: 'bgl_1', display_name: 'Koramangala, Bengaluru', lat: '12.9352', lon: '77.6245' },
  { place_id: 'bgl_2', display_name: 'Indiranagar, Bengaluru', lat: '12.9784', lon: '77.6408' },
  { place_id: 'bgl_3', display_name: 'HSR Layout, Bengaluru', lat: '12.9116', lon: '77.6388' },
  { place_id: 'bgl_4', display_name: 'Whitefield, Bengaluru', lat: '12.9696', lon: '77.7497' },
  { place_id: 'bgl_5', display_name: 'Electronic City Phase 1, Bengaluru', lat: '12.8452', lon: '77.6602' },
  { place_id: 'bgl_6', display_name: 'MG Road, Bengaluru', lat: '12.9756', lon: '77.6066' },
  { place_id: 'bgl_7', display_name: 'Jayanagar, Bengaluru', lat: '12.9299', lon: '77.5824' },
  { place_id: 'bgl_8', display_name: 'Yelahanka New Town, Bengaluru', lat: '13.1007', lon: '77.5963' }
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

  // Autocomplete Suggestions Engine
  useEffect(() => {
    if (!query.trim()) {
      setSuggestions(POPULAR_BENGALURU_LOCATIONS.slice(0, 5));
      return;
    }

    const directActionItem: SuggestionItem = {
      place_id: `search_${Date.now()}`,
      display_name: `Search maps for "${query}"`,
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

      // Attempt A: Google Places Autocomplete Service
      if (typeof window !== 'undefined' && window.google && window.google.maps && window.google.maps.places) {
        try {
          const service = new window.google.maps.places.AutocompleteService();
          service.getPlacePredictions(
            {
              input: query,
              locationBias: {
                center: { lat: 12.9716, lng: 77.5946 },
                radius: 50000
              },
              componentRestrictions: { country: 'in' }
            },
            (predictions, status) => {
              if (status === window.google.maps.places.PlacesServiceStatus.OK && predictions) {
                const googleResults: SuggestionItem[] = predictions.map((p) => ({
                  place_id: p.place_id,
                  display_name: p.description,
                  isGooglePlace: true
                }));
                setSuggestions([directActionItem, ...googleResults.slice(0, 5)]);
                setShowDropdown(true);
                setIsLoading(false);
                return;
              }
            }
          );
        } catch (err) {
          console.warn('Google Places autocomplete error:', err);
        }
      }

      // Attempt B: OpenStreetMap Nominatim Fallback
      const searchQueryFormatted = query.toLowerCase().includes('bengaluru') || query.toLowerCase().includes('bangalore')
        ? query
        : `${query}, Bengaluru`;

      fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQueryFormatted)}&limit=5`)
        .then((res) => (res.ok ? res.json() : []))
        .then((data: SuggestionItem[]) => {
          if (data && data.length > 0) {
            const combined = [directActionItem, ...data, ...localMatches];
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

  const handleTriggerSearch = (searchString: string, placeId?: string | number) => {
    let cleanName = searchString.replace('Search maps for "', '').replace('"', '').trim();
    setQuery(cleanName);
    setShowDropdown(false);

    // If Google Place ID exists and Google Geocoder is loaded
    if (placeId && !String(placeId).startsWith('search_') && typeof window !== 'undefined' && window.google && window.google.maps && window.google.maps.Geocoder) {
      const geocoder = new window.google.maps.Geocoder();
      geocoder.geocode({ placeId: String(placeId) }, (results, status) => {
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

    if (onSearchQuery) {
      onSearchQuery(cleanName);
    }
  };

  const handleSelectSuggestion = (item: SuggestionItem) => {
    if (item.lat && item.lon && onSearchQuery) {
      const cleanName = item.display_name.split(',')[0];
      setQuery(cleanName);
      setShowDropdown(false);
      onSearchQuery(cleanName, { lat: parseFloat(item.lat), lng: parseFloat(item.lon) });
      return;
    }
    handleTriggerSearch(item.display_name, item.place_id);
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
                      handleTriggerSearch(query);
                    }
                  }}
                  onFocus={() => {
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
                <button
                  type="button"
                  onClick={() => {
                    if (query.trim()) handleTriggerSearch(query);
                  }}
                  className="w-6 h-6 bg-black text-white rounded-full flex items-center justify-center ml-1 flex-shrink-0 cursor-pointer"
                >
                  <Search className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* Autocomplete Dropdown List */}
          {showDropdown && (
            <div className="absolute top-full left-0 right-0 mt-1.5 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="px-3.5 py-2 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                <span className="flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-brand-500" />
                  <span>Location Search Suggestions</span>
                </span>
                {isLoading && <span className="text-brand-500 animate-pulse">Searching...</span>}
              </div>
              <div className="max-h-60 overflow-y-auto divide-y divide-slate-50">
                {suggestions.map((item) => (
                  <button
                    key={item.place_id}
                    onClick={() => handleSelectSuggestion(item)}
                    className="w-full text-left px-3.5 py-2.5 hover:bg-brand-50/60 flex items-start gap-2.5 transition-colors group"
                  >
                    <Navigation className="w-3.5 h-3.5 text-slate-400 group-hover:text-brand-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-bold text-slate-800 group-hover:text-brand-600 line-clamp-1">
                        {item.display_name}
                      </p>
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
