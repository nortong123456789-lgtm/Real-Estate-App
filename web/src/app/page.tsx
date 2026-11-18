'use client';

import React, { useEffect, useState } from 'react';
import Script from 'next/script';
import { Listing, DraftUpdatePayload } from '@/types';
import { fetchDraftListings, fetchActiveListings, updateDraftListing, deleteListing } from '@/lib/api';
import Header from '@/components/Header';
import MapComponent from '@/components/MapComponent';
import DraftsList from '@/components/DraftsList';
import PropertyCard from '@/components/PropertyCard';
import DraftCompletionForm from '@/components/DraftCompletionForm';
import AgentChatDrawer from '@/components/AgentChatDrawer';
import FilterBottomSheet, { FilterState } from '@/components/FilterBottomSheet';
import LoginModal from '@/components/LoginModal';
import { RefreshCw, MapPin, PlusCircle, Building, Search, Home as HomeIcon, User, Sparkles, ChevronLeft, ChevronRight, Bot, SlidersHorizontal, Navigation } from 'lucide-react';

const SPEC_KEYWORDS = ['bhk', 'villa', 'studio', 'apartment', 'house', 'penthouse'];
const ITEMS_PER_PAGE = 6;

// Haversine Distance Formula in Kilometers
function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
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

export default function DashboardPage(): React.JSX.Element {
  const [drafts, setDrafts] = useState<Listing[]>([]);
  const [activeListings, setActiveListings] = useState<Listing[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedDraft, setSelectedDraft] = useState<Listing | null>(null);
  const [selectedCoords, setSelectedCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAgentOpen, setIsAgentOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  // Authentication & Role State
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  // Filters State
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filterState, setFilterState] = useState<FilterState>({
    minPrice: '',
    maxPrice: '',
    propertyType: 'All Types',
    selectedAmenities: []
  });

  // View Switcher ('properties' | 'map' | 'drafts')
  const [currentView, setCurrentView] = useState<'properties' | 'map' | 'drafts'>('properties');

  const googleMapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || 'YOUR_GOOGLE_MAPS_API_KEY';

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const role = sessionStorage.getItem('apnaghar_role');
      if (role === 'admin') setIsAdmin(true);
    }
  }, []);

  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('apnaghar_role');
    }
    setIsAdmin(false);
    setCurrentView('properties');
  };

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

  const handleCreateListingAtCoords = (coords?: { lat: number; lng: number } | null) => {
    if (!isAdmin) return;

    const targetCoords = coords || selectedCoords || mapCenter || { lat: 12.9716, lng: 77.5946 };

    const newDraftStub: Listing = {
      id: `draft_${Date.now()}`,
      status: 'draft',
      configuration: '2 BHK Apartment',
      rent_amount: 25000,
      latitude: targetCoords.lat,
      longitude: targetCoords.lng,
      description: `Spacious modern apartment located at searched pin (${targetCoords.lat.toFixed(4)}, ${targetCoords.lng.toFixed(4)}).`,
      admin_notes: 'Created by Admin via Searched Map Pin.',
      media_files: [],
      created_at: new Date().toISOString()
    };

    setSelectedDraft(newDraftStub);
    setSelectedCoords(targetCoords);
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

  // Handle Global Search & Map Re-centering with Google Geocoder Priority
  const handleSearchQuery = async (query: string, coords?: { lat: number; lng: number }) => {
    setSearchQuery(query);
    setCurrentPage(1);

    if (coords) {
      setMapCenter(coords);
      setSelectedCoords(coords);
      return;
    }

    if (!query.trim()) {
      setMapCenter(null);
      setSelectedCoords(null);
      return;
    }

    const searchQueryFormatted = query.toLowerCase().includes('bengaluru') || query.toLowerCase().includes('bangalore')
      ? query
      : `${query}, Bengaluru, Karnataka`;

    // Attempt 1: Google Maps Geocoder if loaded
    if (typeof window !== 'undefined' && window.google && window.google.maps && window.google.maps.Geocoder) {
      try {
        const geocoder = new window.google.maps.Geocoder();
        geocoder.geocode(
          {
            address: searchQueryFormatted,
            bounds: { north: 13.2500, south: 12.7000, east: 77.8500, west: 77.3500 }
          },
          (results, status) => {
            if (status === 'OK' && results && results[0]) {
              const loc = results[0].geometry.location;
              const newCoords = { lat: loc.lat(), lng: loc.lng() };
              setMapCenter(newCoords);
              setSelectedCoords(newCoords);
              return;
            }
          }
        );
      } catch (err) {
        console.warn('Google geocoder search error:', err);
      }
    }

    // Attempt 2: OpenStreetMap Nominatim Fallback
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQueryFormatted)}&limit=1`
      );
      if (res.ok) {
        const data = await res.json();
        if (data && data.length > 0) {
          const newLat = parseFloat(data[0].lat);
          const newLng = parseFloat(data[0].lon);
          const newCoords = { lat: newLat, lng: newLng };
          setMapCenter(newCoords);
          setSelectedCoords(newCoords);
        }
      }
    } catch (err) {
      console.warn('Nominatim geocoding search error:', err);
    }
  };

  // Filter active listings by search query and FilterState + sort by proximity to mapCenter/selectedCoords
  const filteredListings = activeListings
    .map((item) => {
      let distance = 999;
      if (selectedCoords && item.latitude && item.longitude) {
        distance = calculateDistanceKm(selectedCoords.lat, selectedCoords.lng, Number(item.latitude), Number(item.longitude));
      }
      return { ...item, distanceKm: distance };
    })
    .filter((item) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const isSpecQuery = SPEC_KEYWORDS.some((kw) => q.includes(kw));

        if (isSpecQuery) {
          const configMatch = item.configuration?.toLowerCase().includes(q) ?? false;
          const descMatch = item.description?.toLowerCase().includes(q) ?? false;
          if (!configMatch && !descMatch) return false;
        }
      }

      if (filterState.minPrice !== '' && item.rent_amount && item.rent_amount < Number(filterState.minPrice)) {
        return false;
      }
      if (filterState.maxPrice !== '' && item.rent_amount && item.rent_amount > Number(filterState.maxPrice)) {
        return false;
      }

      if (filterState.propertyType !== 'All Types' && item.configuration) {
        const prefix = filterState.propertyType.split(' ')[0].toLowerCase();
        if (!item.configuration.toLowerCase().includes(prefix)) {
          return false;
        }
      }

      return true;
    })
    .sort((a, b) => (a.distanceKm ?? 999) - (b.distanceKm ?? 999));

  // Pagination Calculations
  const totalPages = Math.ceil(filteredListings.length / ITEMS_PER_PAGE) || 1;
  const paginatedListings = filteredListings.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const hasActiveFilters =
    filterState.minPrice !== '' ||
    filterState.maxPrice !== '' ||
    filterState.propertyType !== 'All Types' ||
    filterState.selectedAmenities.length > 0;

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex flex-col font-sans overflow-x-hidden pb-20 md:pb-8">
      {/* Load Google Maps Places Script Globally */}
      {googleMapsApiKey && googleMapsApiKey !== 'YOUR_GOOGLE_MAPS_API_KEY' && (
        <Script
          src={`https://maps.googleapis.com/maps/api/js?key=${googleMapsApiKey}&libraries=places`}
          strategy="afterInteractive"
        />
      )}

      {/* Header Bar */}
      <Header
        draftsCount={drafts.length}
        isAdmin={isAdmin}
        onOpenDrafts={() => {
          if (isAdmin) {
            setCurrentView('drafts');
            if (drafts.length > 0 && !selectedDraft) setSelectedDraft(drafts[0]);
          } else {
            setIsLoginModalOpen(true);
          }
        }}
        onOpenLoginModal={() => setIsLoginModalOpen(true)}
        onLogout={handleLogout}
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
        {/* Left Column: Drafts Queue (Desktop Sidebar - VISIBLE ONLY TO ADMIN) */}
        {isAdmin && (
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
        )}

        {/* Right Column: Main Content (Vertical Scrolling Grid with Pagination OR Vector Map) */}
        <div
          className="flex-1 flex flex-col min-h-[480px] w-full"
          style={{ width: '100%', minHeight: '480px' }}
        >
          {currentView === 'properties' ? (
            /* Vertical Scrolling Grid with Pagination */
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xs sm:text-sm font-extrabold text-slate-600 uppercase tracking-wider">
                    {searchQuery ? `Active properties near "${searchQuery}"` : 'Active properties'} ({filteredListings.length})
                  </h2>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setIsFilterOpen(true)}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold border flex items-center gap-1.5 transition-all ${
                      hasActiveFilters
                        ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                    <span>Filters</span>
                    {hasActiveFilters && (
                      <span className="w-2 h-2 rounded-full bg-brand-500"></span>
                    )}
                  </button>

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
                  <p className="text-sm font-bold text-slate-800">No active listings match your search/filters</p>
                  <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                    Try adjusting your price range or property type in filters!
                  </p>
                </div>
              ) : (
                <>
                  {/* Vertical Scrolling Grid (1 col mobile, 2 col sm, 3 col lg) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
                    {paginatedListings.map((listing) => (
                      <PropertyCard
                        key={listing.id}
                        listing={listing}
                        onSelect={handleSelectProperty}
                      />
                    ))}
                  </div>

                  {/* Pagination Controls */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between pt-4 pb-2 border-t border-slate-200">
                      <button
                        onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                        className="px-3 py-1.5 bg-white border border-slate-200 disabled:opacity-40 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-1"
                      >
                        <ChevronLeft className="w-4 h-4" />
                        <span>Previous</span>
                      </button>

                      <div className="text-xs font-extrabold text-slate-600">
                        Page {currentPage} of {totalPages}
                      </div>

                      <button
                        onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                        disabled={currentPage === totalPages}
                        className="px-3 py-1.5 bg-white border border-slate-200 disabled:opacity-40 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-1"
                      >
                        <span>Next</span>
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          ) : currentView === 'map' ? (
            /* Vector Map View */
            <div className="flex flex-col gap-4 w-full h-full min-h-[500px]">
              <div
                className="w-full h-[60vh] min-h-[420px] sm:min-h-[520px] relative rounded-2xl md:rounded-3xl overflow-hidden shadow-md"
                style={{ width: '100%', minHeight: '420px' }}
              >
                <MapComponent
                  activeListings={filteredListings}
                  selectedCoords={selectedCoords}
                  mapCenter={mapCenter}
                  onMapClick={(coords) => {
                    setSelectedCoords(coords);
                    if (isAdmin) {
                      handleCreateListingAtCoords(coords);
                    }
                  }}
                  onSelectListing={handleSelectProperty}
                  onCreateListingAtCoords={handleCreateListingAtCoords}
                  isAdmin={isAdmin}
                  apiKey={googleMapsApiKey}
                />
              </div>

              {/* Compact Property Grid below map when in Map View Mode */}
              <div className="pt-2">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">
                    Active properties near searched pin ({filteredListings.length})
                  </h3>

                  {isAdmin && (
                    <button
                      onClick={() => handleCreateListingAtCoords()}
                      className="bg-slate-900 text-white font-extrabold text-[11px] px-3 py-1.5 rounded-xl shadow-xs flex items-center gap-1"
                    >
                      <PlusCircle className="w-3.5 h-3.5 text-emerald-400" />
                      <span>+ Add Property at Searched Pin</span>
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {filteredListings.slice(0, 6).map((listing) => (
                    <PropertyCard key={listing.id} listing={listing} onSelect={handleSelectProperty} />
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* Drafts Mobile Fallback (Admin Only) */
            isAdmin ? (
              <div className="md:hidden">
                <DraftsList
                  drafts={drafts}
                  onSelectDraft={handleSelectProperty}
                />
              </div>
            ) : null
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

        {/* Drafts Tab - VISIBLE ONLY TO ADMIN */}
        {isAdmin && (
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
        )}

        <button
          onClick={() => setIsAgentOpen(true)}
          className="p-2 bg-slate-900 text-white rounded-full transition-transform hover:scale-105 ml-0.5 touch-target flex items-center justify-center"
          title="Open Agent Assistant"
        >
          <Bot className="w-3.5 h-3.5 text-emerald-400" />
        </button>
      </div>

      {/* Admin Login Modal */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onSuccessLogin={() => setIsAdmin(true)}
      />

      {/* Filter Bottom Sheet Modal */}
      <FilterBottomSheet
        isOpen={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        filters={filterState}
        onApplyFilters={(newFilters) => setFilterState(newFilters)}
        onResetFilters={() =>
          setFilterState({
            minPrice: '',
            maxPrice: '',
            propertyType: 'All Types',
            selectedAmenities: []
          })
        }
      />

      {/* Agent Chat Drawer Assistant */}
      <AgentChatDrawer
        isOpen={isAgentOpen}
        onClose={() => setIsAgentOpen(false)}
      />

      {/* Property Showcase / Editor / Delete Modal */}
      {selectedDraft && (
        <DraftCompletionForm
          property={selectedDraft}
          selectedCoords={selectedCoords}
          isAdmin={isAdmin}
          onClose={() => setSelectedDraft(null)}
          onSubmit={handleCompleteDraft}
          onDelete={handleDeleteListing}
          onUpdateCoords={(coords) => {
            setSelectedCoords(coords);
            setMapCenter(coords);
          }}
        />
      )}
    </div>
  );
}
