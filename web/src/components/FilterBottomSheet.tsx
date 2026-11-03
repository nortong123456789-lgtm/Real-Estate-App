'use client';

import React, { useState } from 'react';
import { X, SlidersHorizontal, Check, RotateCcw, Building, IndianRupee, Sparkles } from 'lucide-react';

export interface FilterState {
  minPrice: number | '';
  maxPrice: number | '';
  propertyType: string;
  selectedAmenities: string[];
}

interface FilterBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  filters: FilterState;
  onApplyFilters: (newFilters: FilterState) => void;
  onResetFilters: () => void;
}

const PROPERTY_TYPES = [
  'All Types',
  '1 BHK Apartment',
  '2 BHK Apartment',
  '3 BHK Apartment',
  '4+ BHK / Villa',
  'Studio Apartment'
];

const AMENITIES = [
  'Balcony',
  'Power Backup',
  'Fully Furnished',
  'Covered Parking',
  'High-speed Wi-Fi',
  'Gym & Pool'
];

export default function FilterBottomSheet({
  isOpen,
  onClose,
  filters,
  onApplyFilters,
  onResetFilters
}: FilterBottomSheetProps) {
  const [minPrice, setMinPrice] = useState<number | ''>(filters.minPrice);
  const [maxPrice, setMaxPrice] = useState<number | ''>(filters.maxPrice);
  const [propertyType, setPropertyType] = useState<string>(filters.propertyType || 'All Types');
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>(filters.selectedAmenities || []);

  if (!isOpen) return null;

  const toggleAmenity = (amenity: string) => {
    if (selectedAmenities.includes(amenity)) {
      setSelectedAmenities(selectedAmenities.filter((a) => a !== amenity));
    } else {
      setSelectedAmenities([...selectedAmenities, amenity]);
    }
  };

  const handleApply = () => {
    onApplyFilters({
      minPrice,
      maxPrice,
      propertyType,
      selectedAmenities
    });
    onClose();
  };

  const handleReset = () => {
    setMinPrice('');
    setMaxPrice('');
    setPropertyType('All Types');
    setSelectedAmenities([]);
    onResetFilters();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-darkNav/75 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-t-3xl sm:rounded-3xl max-w-lg w-full p-5 sm:p-7 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto">

        {/* Header Bar */}
        <div className="flex items-center justify-between pb-3.5 mb-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-5 h-5 text-brand-500" />
            <h3 className="text-lg font-black text-slate-900">Property Filters</h3>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleReset}
              className="text-xs font-bold text-slate-400 hover:text-brand-500 flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-slate-50 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="space-y-5">
          {/* Price Range */}
          <div>
            <label className="block text-xs font-extrabold text-slate-800 uppercase tracking-wider mb-2 flex items-center gap-1">
              <IndianRupee className="w-3.5 h-3.5 text-brand-500" />
              <span>Price Range (₹ / Month)</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <input
                  type="number"
                  value={minPrice}
                  onChange={(e) => setMinPrice(e.target.value ? Number(e.target.value) : '')}
                  placeholder="Min Price (e.g. 15,000)"
                  className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 text-xs font-semibold text-slate-800 bg-slate-50/50"
                />
              </div>
              <div>
                <input
                  type="number"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value ? Number(e.target.value) : '')}
                  placeholder="Max Price (e.g. 60,000)"
                  className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 text-xs font-semibold text-slate-800 bg-slate-50/50"
                />
              </div>
            </div>
          </div>

          {/* Property Type Selector */}
          <div>
            <label className="block text-xs font-extrabold text-slate-800 uppercase tracking-wider mb-2 flex items-center gap-1">
              <Building className="w-3.5 h-3.5 text-brand-500" />
              <span>Property Type</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {PROPERTY_TYPES.map((type) => {
                const isSelected = propertyType === type;
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setPropertyType(type)}
                    className={`py-2 px-3 rounded-2xl text-xs font-bold transition-all border ${
                      isSelected
                        ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    {type}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Amenities Feature Chips */}
          <div>
            <label className="block text-xs font-extrabold text-slate-800 uppercase tracking-wider mb-2 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-brand-500" />
              <span>Conveniences & Features</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {AMENITIES.map((amenity) => {
                const isChecked = selectedAmenities.includes(amenity);
                return (
                  <button
                    key={amenity}
                    type="button"
                    onClick={() => toggleAmenity(amenity)}
                    className={`py-2 px-3.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 border ${
                      isChecked
                        ? 'bg-brand-500 text-white border-brand-500 shadow-sm'
                        : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    {isChecked && <Check className="w-3.5 h-3.5 text-white" />}
                    <span>{amenity}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Action Button */}
          <div className="pt-2">
            <button
              type="button"
              onClick={handleApply}
              className="w-full py-3.5 bg-slate-900 hover:bg-black text-white font-extrabold text-sm rounded-2xl shadow-lg transition-all"
            >
              APPLY FILTERS
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
