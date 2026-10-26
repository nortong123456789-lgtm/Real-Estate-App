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
    }, 300); // 300ms debounce

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
    <header className="w-full flex-shrink-0 z-30 shadow-xs bg-white">
      {/* Dark Top Contact Bar (Desktop Only) */}
      <div className="hidden md:flex bg-darkNav text-slate-300 text-xs py-2 px-6 items-center justify-between border-b border-slate-800">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-1.5 hover:text-white transition-colors cursor-pointer">
            <Mail className="w-3.5 h-3.5 text-brand-500" />
            <span>support@apnaghar.com</span>
          </div>
          <div className="flex items-center gap-1.5 hover:text-white transition-colors cursor-pointer">
            <MapPin className="w-3.5 h-3.5 text-brand-500" />
            <span>Bengaluru, KA, India</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={onOpenDrafts}
            className="bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs px-3.5 py-1 rounded-md flex items-center gap-1.5 transition-all shadow-sm"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Drafts Queue ({draftsCount})</span>
          </button>
        </div>
      </div>

      {/* Main Responsive Navbar */}
      <div className="px-4 md:px-8 py-3 border-b border-slate-100 flex items-center justify-between gap-4 shadow-xs">
        {/* Brand Logo - ApnaGhar */}
        <div className="flex items-center gap-2 cursor-pointer flex-shrink-0">
          <div className="bg-brand-50 text-brand-500 p-1.5 md:p-2 rounded-xl border border-brand-100">
            <Home className="w-5 h-5 md:w-6 md:h-6 text-brand-500" />
          </div>
          <div>
            <div className="flex items-baseline">
              <span className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">ApnaGhar</span>
              <span className="text-brand-500 font-bold text-xl md:text-2xl">.</span>
            </div>
            <p className="text-[9px] md:text-[10px] text-slate-400 font-medium -mt-1 tracking-wider uppercase">Real Estate Marketplace</p>
          </div>
        </div>

        {/* Permanently Visible Search Box with Autocomplete Dropdown */}
        <div ref={dropdownRef} className="flex-1 max-w-md mx-2 relative">
          <div className="relative w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={query}
              onChange={(e) => handleInputChange(e.target.value)}
              onFocus={() => {
                if (suggestions.length > 0) setShowDropdown(true);
              }}
              placeholder="Search location, Indiranagar, 2 BHK..."
              className="w-full pl-9 pr-8 py-2 text-xs font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all placeholder:text-slate-400"
            />
            {query && (
              <button
                onClick={handleClear}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-full"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Autocomplete Dropdown List */}
          {showDropdown && (
            <div className="absolute top-full left-0 right-0 mt-1.5 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="px-3 py-2 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                <span>Location Suggestions</span>
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

        {/* Navigation Links (Desktop) */}
        <nav className="hidden lg:flex items-center gap-6 text-sm font-semibold text-slate-700">
          <a href="#" className="text-brand-500 font-bold border-b-2 border-brand-500 pb-0.5">Home</a>
          <a href="#" className="hover:text-brand-500 transition-colors">Properties</a>
          <button onClick={onOpenDrafts} className="hover:text-brand-500 transition-colors flex items-center gap-1">
            <span>Drafts Queue</span>
            {draftsCount > 0 && (
              <span className="bg-brand-500 text-white text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                {draftsCount}
              </span>
            )}
          </button>
        </nav>

        {/* Right Mobile Action */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={onOpenDrafts}
            className="flex md:hidden bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs px-3 py-1.5 rounded-xl items-center gap-1.5 transition-all shadow-xs"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Drafts ({draftsCount})</span>
          </button>

          <button className="hidden sm:block p-2.5 text-slate-600 hover:text-brand-500 hover:bg-brand-50 rounded-full transition-all">
            <User className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
