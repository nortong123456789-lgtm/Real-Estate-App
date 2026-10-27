'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Mail, MapPin, Search, User, PlusCircle, Home, X, Navigation } from 'lucide-react';
import { HeaderProps } from '@/types';

interface SuggestionItem {
  place_id: string | number;
  display_name: string;
  lat: string;
  lon: string;
}

export default function Header({ draftsCount, onOpenDrafts, onSearchQuery }: HeaderProps) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<SuggestionItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch Autocomplete Suggestions as user types
  useEffect(() => {
    if (!query.trim() || query.length < 2) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const searchQueryFormatted = query.toLowerCase().includes('bengaluru') || query.toLowerCase().includes('bangalore')
          ? query
          : `${query}, Bengaluru`;

        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQueryFormatted)}&limit=5`
        );
        if (res.ok) {
          const data: SuggestionItem[] = await res.json();
          setSuggestions(data || []);
          setShowDropdown((data || []).length > 0);
        }
      } catch (err) {
        console.warn('Autocomplete fetch error:', err);
      } finally {
        setIsLoading(false);
      }
    }, 300);

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
    const cleanName = item.display_name.split(',')[0];
    setQuery(cleanName);
    setShowDropdown(false);

    if (onSearchQuery) {
      onSearchQuery(cleanName, {
        lat: parseFloat(item.lat),
        lng: parseFloat(item.lon)
      });
    }
  };

  const handleInputChange = (value: string) => {
    setQuery(value);
    if (onSearchQuery) {
      onSearchQuery(value);
    }
  };

  const handleClear = () => {
    setQuery('');
    setSuggestions([]);
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
                  onFocus={() => {
                    if (suggestions.length > 0) setShowDropdown(true);
                  }}
                  placeholder="Where to? Search..."
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

          {/* Autocomplete Dropdown List */}
          {showDropdown && (
            <div className="absolute top-full left-0 right-0 mt-1.5 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="px-3 py-1.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                <span>Location Suggestions</span>
                {isLoading && <span className="text-brand-500 animate-pulse">Searching...</span>}
              </div>
              <div className="max-h-52 overflow-y-auto divide-y divide-slate-50">
                {suggestions.map((item) => (
                  <button
                    key={item.place_id}
                    onClick={() => handleSelectSuggestion(item)}
                    className="w-full text-left px-3 py-2 hover:bg-brand-50/60 flex items-start gap-2 transition-colors group"
                  >
                    <Navigation className="w-3.5 h-3.5 text-slate-400 group-hover:text-brand-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-bold text-slate-800 group-hover:text-brand-600 line-clamp-1">
                        {item.display_name.split(',')[0]}
                      </p>
                      <p className="text-[10px] text-slate-400 line-clamp-1">
                        {item.display_name.split(',').slice(1).join(',')}
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
          <button
            onClick={onOpenDrafts}
            className="hidden sm:flex bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs px-3 py-1.5 rounded-full items-center gap-1 transition-all"
          >
            <PlusCircle className="w-3.5 h-3.5 text-brand-500" />
            <span>Drafts ({draftsCount})</span>
          </button>

          <button className="bg-brand-500 hover:bg-brand-600 text-white font-extrabold text-xs px-3.5 py-1.5 rounded-full flex items-center gap-1 shadow-2xs transition-all">
            <User className="w-3.5 h-3.5" />
            <span>Log In</span>
          </button>
        </div>
      </div>
    </header>
  );
}
