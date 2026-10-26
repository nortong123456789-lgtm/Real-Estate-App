'use client';

import React, { useEffect, useState } from 'react';
import { Listing, DraftUpdatePayload } from '@/types';
import { fetchDraftListings, fetchActiveListings, updateDraftListing, deleteListing } from '@/lib/api';
import Header from '@/components/Header';
import MapComponent from '@/components/MapComponent';
import DraftsList from '@/components/DraftsList';
import PropertyCard from '@/components/PropertyCard';
import DraftCompletionForm from '@/components/DraftCompletionForm';
import { RefreshCw, MapPin, Layers, PlusCircle, Building, LayoutGrid } from 'lucide-react';

export default function DashboardPage(): React.JSX.Element {
  const [drafts, setDrafts] = useState<Listing[]>([]);
  const [activeListings, setActiveListings] = useState<Listing[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedDraft, setSelectedDraft] = useState<Listing | null>(null);
  const [selectedCoords, setSelectedCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [loading, setLoading] = useState(true);

  // Desktop & Mobile View Switcher ('map' | 'drafts' | 'properties')
  const [currentView, setCurrentView] = useState<'map' | 'drafts' | 'properties'>('map');

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
    const neighborhoodMatch = item.neighborhood?.toLowerCase().includes(q) ?? false;
    const configMatch = item.configuration?.toLowerCase().includes(q) ?? false;
    return neighborhoodMatch || configMatch;
  });

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex flex-col font-sans overflow-x-hidden">
      {/* ApnaGhar Header with Live Autocomplete Suggestions */}
      <Header
        draftsCount={drafts.length}
        onOpenDrafts={() => {
          setCurrentView('drafts');
          if (drafts.length > 0 && !selectedDraft) setSelectedDraft(drafts[0]);
        }}
        onSearchQuery={handleSearchQuery}
      />

      {/* Hero Bar with Mode Tabs */}
      <section className="bg-white border-b border-slate-100 py-4 sm:py-6 px-4 sm:px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Bengaluru Property Map & Marketplace
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Click active property cards or pins to view/edit/delete, search any location, or select drafts to publish live.
            </p>
          </div>

          {/* Desktop & Mobile View Tabs */}
          <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-2xl border border-slate-200/80">
            <button
              onClick={() => setCurrentView('map')}
              className={`px-3.5 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-all ${
                currentView === 'map'
                  ? 'bg-brand-500 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <MapPin className="w-3.5 h-3.5" />
              <span>Vector Map</span>
            </button>

            <button
              onClick={() => setCurrentView('properties')}
              className={`px-3.5 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-all ${
                currentView === 'properties'
                  ? 'bg-brand-500 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Listings Grid ({filteredListings.length})</span>
            </button>

            <button
              onClick={() => setCurrentView('drafts')}
              className={`px-3.5 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-all ${
                currentView === 'drafts'
                  ? 'bg-brand-500 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Drafts ({drafts.length})</span>
            </button>

            <button
              onClick={() => loadData(true)}
              className="p-2 text-slate-500 hover:text-slate-900 rounded-xl transition-colors ml-1"
              title="Refresh Data"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-brand-500' : ''}`} />
            </button>
          </div>
        </div>
      </section>

      {/* Main Workspace */}
      <main className="flex-1 w-full max-w-7xl mx-auto p-3 sm:p-6 md:p-8 flex flex-col md:flex-row gap-4 md:gap-8">
        {/* Left Column: Drafts Sidebar */}
        <div
          className={`w-full md:w-80 lg:w-96 flex-shrink-0 min-h-[450px] ${
            currentView === 'drafts' ? 'block' : 'hidden md:block'
          }`}
        >
          <DraftsList
            drafts={drafts}
            onSelectDraft={handleSelectProperty}
          />
        </div>

        {/* Right Column: Main Content (Map OR Properties Grid) */}
        <div
          className="flex-1 flex flex-col min-h-[520px] w-full"
          style={{ minHeight: '520px', width: '100%' }}
        >
          {currentView === 'map' ? (
            /* Vector Map View */
            <div
              className="w-full h-full min-h-[500px] relative"
              style={{ width: '100%', height: '100%', minHeight: '500px' }}
            >
              <MapComponent
                activeListings={filteredListings}
                selectedCoords={selectedCoords}
                mapCenter={mapCenter}
                onMapClick={(coords) => setSelectedCoords(coords)}
                onSelectListing={handleSelectProperty}
                apiKey={googleMapsApiKey}
              />

              {/* Floating Quick Action Badge */}
              {drafts.length > 0 && (
                <button
                  onClick={() => {
                    setCurrentView('drafts');
                    if (!selectedDraft) setSelectedDraft(drafts[0]);
                  }}
                  className="md:hidden absolute bottom-4 left-4 right-4 bg-brand-500 text-white font-extrabold text-xs py-3 px-4 rounded-2xl shadow-xl flex items-center justify-center gap-2 border border-white/20"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Configure {drafts.length} Pending Drafts</span>
                </button>
              )}
            </div>
          ) : currentView === 'properties' ? (
            /* Active Listings Grid View */
            <div className="py-2">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-black text-slate-900">Active Property Listings</h2>
                <span className="text-xs font-bold text-slate-400">
                  {filteredListings.length} Properties Available
                </span>
              </div>

              {filteredListings.length === 0 ? (
                <div className="bg-white rounded-2xl p-12 text-center border border-slate-100 text-slate-400 shadow-sm">
                  <Building className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                  <p className="text-base font-bold text-slate-800">No active listings found</p>
                  <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                    Select a draft from the left sidebar to set coordinates and publish it live!
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {filteredListings.map((listing) => (
                    <PropertyCard
                      key={listing.id}
                      listing={listing}
                      onSelect={handleSelectProperty}
                    />
                  ))}
                </div>
              )}
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
