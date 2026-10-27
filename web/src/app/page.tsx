'use client';

import React, { useEffect, useState } from 'react';
import { Listing, DraftUpdatePayload } from '@/types';
import { fetchDraftListings, fetchActiveListings, updateDraftListing, deleteListing } from '@/lib/api';
import Header from '@/components/Header';
import MapComponent from '@/components/MapComponent';
import DraftsList from '@/components/DraftsList';
import PropertyCard from '@/components/PropertyCard';
import DraftCompletionForm from '@/components/DraftCompletionForm';
import { RefreshCw, MapPin, PlusCircle, Building, Search, Home as HomeIcon, User, Sparkles, ChevronLeft, ChevronRight } from 'lucide-react';

export default function DashboardPage(): React.JSX.Element {
  const [drafts, setDrafts] = useState<Listing[]>([]);
  const [activeListings, setActiveListings] = useState<Listing[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedDraft, setSelectedDraft] = useState<Listing | null>(null);
  const [selectedCoords, setSelectedCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [loading, setLoading] = useState(true);

  // View Switcher ('properties' | 'map' | 'drafts')
  const [currentView, setCurrentView] = useState<'properties' | 'map' | 'drafts'>('properties');

  const googleMapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || 'YOUR_GOOGLE_MAPS_API_KEY';

  const loadData = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const [draftsData, activeData] = await Promise.all([
        fetchDraftListings().catch(() => []),
        fetchActiveListings().catch(() => [])
      ]);
      setDrafts(draftsData);
      setActiveListings(activeData);
    } catch (err) {
      console.error('Error loading listings data', err);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    loadData(true);

    // Auto-poll for new Android media dumps every 5 seconds
    const interval = setInterval(() => {
      loadData(false);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const handleSelectProperty = (listing: Listing) => {
    setSelectedDraft(listing);
    if (listing.latitude && listing.longitude) {
      setSelectedCoords({ lat: listing.latitude, lng: listing.longitude });
      setMapCenter({ lat: listing.latitude, lng: listing.longitude });
    } else if (!selectedCoords) {
      setSelectedCoords({ lat: 12.9716, lng: 77.5946 }); // Default Bengaluru Center
    }
  };

  const handleCompleteDraft = async (payload: DraftUpdatePayload) => {
    if (!selectedDraft) return;
    await updateDraftListing(selectedDraft.id, payload);
    setSelectedDraft(null);
    loadData(true);
  };

  const handleDeleteListing = async (id: string) => {
    try {
      await deleteListing(id);
      setSelectedDraft(null);
      loadData(true);
    } catch (err) {
      console.error('Failed to delete listing', err);
    }
  };

  // Handle Global Search & Map Re-centering from Search & Suggestions
  const handleSearchQuery = async (query: string, coords?: { lat: number; lng: number }) => {
    setSearchQuery(query);

    if (coords) {
      setMapCenter(coords);
      return;
    }

    if (!query.trim()) {
      setMapCenter(null);
      return;
    }

    const searchQueryFormatted = query.toLowerCase().includes('bengaluru') || query.toLowerCase().includes('bangalore')
      ? query
      : `${query}, Bengaluru, Karnataka`;

    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQueryFormatted)}&limit=1`
      );
      if (res.ok) {
        const data = await res.json();
        if (data && data.length > 0) {
          const newLat = parseFloat(data[0].lat);
          const newLng = parseFloat(data[0].lon);
          setMapCenter({ lat: newLat, lng: newLng });
        }
      }
    } catch (err) {
      console.warn('Geocoding search error:', err);
    }
  };

  // Filter active listings by search query
  const filteredListings = activeListings.filter((item) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const configMatch = item.configuration?.toLowerCase().includes(q) ?? false;
    const descMatch = item.description?.toLowerCase().includes(q) ?? false;
    return configMatch || descMatch;
  });

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex flex-col font-sans overflow-x-hidden pb-20 md:pb-8">
      {/* Header Bar */}
      <Header
        draftsCount={drafts.length}
        onOpenDrafts={() => {
          setCurrentView('drafts');
          if (drafts.length > 0 && !selectedDraft) setSelectedDraft(drafts[0]);
        }}
        onSearchQuery={handleSearchQuery}
      />

      {/* Ultra-Compact Mobile-Optimized Hero Section */}
      <section className="bg-gradient-to-b from-white to-pink-50/20 border-b border-pink-100/40 py-3 sm:py-4 px-3 sm:px-6 text-center relative overflow-hidden">
        <div className="max-w-2xl mx-auto space-y-1.5">
          <div className="inline-flex items-center gap-1 bg-pink-100/70 text-brand-600 px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wider uppercase">
            <Sparkles className="w-3 h-3 text-brand-500" />
            <span>Premium Apartments for Rent & Sale · Bengaluru</span>
          </div>

          <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-slate-900 tracking-tight leading-snug font-serif">
            Stay in Comfort, <span className="text-brand-500">Live with Style.</span>
          </h1>
        </div>
      </section>

      {/* Main Content Workspace */}
      <main className="flex-1 w-full max-w-7xl mx-auto p-2.5 sm:p-5 md:p-6 flex flex-col md:flex-row gap-4 sm:gap-6">
        {/* Left Column: Drafts Queue (Desktop Sidebar) */}
        <div
          className={`w-full md:w-80 lg:w-96 flex-shrink-0 ${
            currentView === 'drafts' ? 'block' : 'hidden md:block'
          }`}
        >
          <DraftsList
            drafts={drafts}
            onSelectDraft={handleSelectProperty}
          />
        </div>

        {/* Right Column: Main Content (Listings Grid OR Vector Map) */}
        <div
          className="flex-1 flex flex-col min-h-[480px] w-full"
          style={{ width: '100%', minHeight: '480px' }}
        >
          {currentView === 'properties' ? (
            /* Horizontal Swipeable Property Carousel View */
            <div className="space-y-3 relative">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-brand-500 font-extrabold text-[9px] uppercase tracking-wider bg-brand-50 px-2 py-0.5 rounded-full border border-brand-100">
                    OUR BUILDINGS
                  </span>
                  <h2 className="text-lg sm:text-xl font-black text-slate-900 mt-0.5">
                    Prime locations across Bengaluru
                  </h2>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => loadData(true)}
                    className="p-1.5 text-slate-500 hover:text-slate-900 bg-white rounded-full border border-slate-200 transition-colors shadow-2xs"
                    title="Refresh Data"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-brand-500' : ''}`} />
                  </button>
                  <button
                    onClick={() => setCurrentView('map')}
                    className="bg-brand-50 text-brand-600 hover:bg-brand-500 hover:text-white font-extrabold text-[11px] px-3 py-1.5 rounded-full border border-brand-100 transition-all shadow-2xs flex items-center gap-1"
                  >
                    <MapPin className="w-3.5 h-3.5" />
                    <span>Map View</span>
                  </button>
                </div>
              </div>

              {filteredListings.length === 0 ? (
                <div className="bg-white rounded-3xl p-8 text-center border border-slate-100 text-slate-400 shadow-xs">
                  <Building className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                  <p className="text-sm font-bold text-slate-800">No active listings match your search</p>
                  <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                    Select a draft from the sidebar to set location and publish live!
                  </p>
                </div>
              ) : (
                <div className="relative group">
                  {/* Arrow Navigation Buttons (Desktop) */}
                  {filteredListings.length > 1 && (
                    <div className="hidden sm:flex items-center gap-1.5 absolute -top-10 right-0 z-10">
                      <button
                        onClick={() => {
                          const container = document.getElementById('property-carousel-container');
                          if (container) container.scrollBy({ left: -320, behavior: 'smooth' });
                        }}
                        className="p-1.5 bg-white border border-slate-200 text-slate-700 hover:bg-brand-500 hover:text-white rounded-full shadow-2xs transition-all"
                        title="Previous Property"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          const container = document.getElementById('property-carousel-container');
                          if (container) container.scrollBy({ left: 320, behavior: 'smooth' });
                        }}
                        className="p-1.5 bg-white border border-slate-200 text-slate-700 hover:bg-brand-500 hover:text-white rounded-full shadow-2xs transition-all"
                        title="Next Property"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  {/* Swipeable Horizontal Property Carousel */}
                  <div
                    id="property-carousel-container"
                    className="flex gap-3.5 sm:gap-5 overflow-x-auto snap-x snap-mandatory scrollbar-none pb-3 pt-1 px-0.5 scroll-smooth"
                  >
                    {filteredListings.map((listing) => (
                      <div key={listing.id} className="w-[82vw] sm:w-[300px] md:w-[330px] flex-shrink-0 snap-start">
                        <PropertyCard
                          listing={listing}
                          onSelect={handleSelectProperty}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : currentView === 'map' ? (
            /* Vector Map View */
            <div
              className="w-full h-full min-h-[480px] relative"
              style={{ width: '100%', height: '100%', minHeight: '480px' }}
            >
              <MapComponent
                activeListings={filteredListings}
                selectedCoords={selectedCoords}
                mapCenter={mapCenter}
                onMapClick={(coords) => setSelectedCoords(coords)}
                onSelectListing={handleSelectProperty}
                apiKey={googleMapsApiKey}
              />
            </div>
          ) : (
            /* Drafts Mobile Fallback */
            <div className="md:hidden">
              <DraftsList
                drafts={drafts}
                onSelectDraft={handleSelectProperty}
              />
            </div>
          )}
        </div>
      </main>

      {/* Compact Floating Pill Mobile Navigation Bar */}
      <div className="fixed bottom-3 left-1/2 -translate-x-1/2 z-40 bg-white/95 backdrop-blur-xl border border-slate-200/90 rounded-full px-2.5 py-1.5 shadow-2xl flex items-center gap-1">
        <button
          onClick={() => setCurrentView('properties')}
          className={`px-3.5 py-1.5 rounded-full text-xs font-black flex items-center gap-1 transition-all ${
            currentView === 'properties'
              ? 'bg-brand-500 text-white shadow-md shadow-brand-500/30 scale-105'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Search className="w-3.5 h-3.5" />
          <span>Explore</span>
        </button>

        <button
          onClick={() => setCurrentView('map')}
          className={`px-3.5 py-1.5 rounded-full text-xs font-black flex items-center gap-1 transition-all ${
            currentView === 'map'
              ? 'bg-brand-500 text-white shadow-md shadow-brand-500/30 scale-105'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <MapPin className="w-3.5 h-3.5" />
          <span>Map</span>
        </button>

        <button
          onClick={() => setCurrentView('drafts')}
          className={`px-3.5 py-1.5 rounded-full text-xs font-black flex items-center gap-1 transition-all ${
            currentView === 'drafts'
              ? 'bg-brand-500 text-white shadow-md shadow-brand-500/30 scale-105'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <PlusCircle className="w-3.5 h-3.5" />
          <span>Drafts ({drafts.length})</span>
        </button>

        <button
          onClick={() => alert('ApnaGhar User Profile')}
          className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-full transition-colors ml-0.5"
        >
          <User className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Property Showcase / Editor / Delete Modal */}
      {selectedDraft && (
        <DraftCompletionForm
          property={selectedDraft}
          selectedCoords={selectedCoords}
          onClose={() => setSelectedDraft(null)}
          onSubmit={handleCompleteDraft}
          onDelete={handleDeleteListing}
        />
      )}
    </div>
  );
}
