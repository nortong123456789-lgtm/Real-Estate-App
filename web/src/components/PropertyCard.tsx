'use client';

import React from 'react';
import { Listing } from '@/types';
import { getMediaProxyUrl } from '@/lib/api';
import { MapPin, Camera, Sparkles, Flame } from 'lucide-react';

interface PropertyCardProps {
  listing: Listing;
  onSelect?: (listing: Listing) => void;
}

export default function PropertyCard({ listing, onSelect }: PropertyCardProps) {
  const primaryMedia = listing.media_files[0];
  const mediaUrl = primaryMedia ? getMediaProxyUrl(primaryMedia) : null;

  return (
    <div
      onClick={() => onSelect && onSelect(listing)}
      className="bg-white rounded-3xl p-2 sm:p-3 border border-slate-100 shadow-xs hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 overflow-hidden cursor-pointer group flex flex-col"
    >
      {/* Top Image Container matching ANI Living Spaces Reference */}
      <div className="relative w-full h-56 sm:h-64 bg-slate-100 rounded-3xl overflow-hidden">
        {mediaUrl ? (
          <img
            src={mediaUrl}
            alt={listing.configuration || 'Property'}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-slate-100 text-slate-400 p-4 text-center">
            <Camera className="w-8 h-8 mb-1 opacity-40 text-brand-500" />
            <span className="text-xs font-medium">Property Photos</span>
          </div>
        )}

        {/* Top Badges Column */}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5 items-start z-10">
          <div className="bg-brand-500 text-white text-[10px] font-extrabold px-3 py-1 rounded-full shadow-md">
            Featured Deal
          </div>
          <div className="bg-amber-400 text-slate-900 text-[10px] font-black px-2.5 py-0.5 rounded-full shadow-sm flex items-center gap-1">
            <Flame className="w-3 h-3 text-slate-900 fill-slate-900" />
            <span>10% OFF</span>
          </div>
        </div>

        {/* Media Counter Badge */}
        {listing.media_files.length > 0 && (
          <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-md text-white text-[10px] font-extrabold px-2.5 py-1 rounded-full flex items-center gap-1">
            <Camera className="w-3 h-3 text-brand-500" />
            <span>{listing.media_files.length} Photos</span>
          </div>
        )}

        {/* Dot Pagination Indicator at bottom of photo */}
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-black/30 backdrop-blur-md px-2.5 py-1 rounded-full">
          <div className="w-2 h-2 rounded-full bg-white"></div>
          <div className="w-1.5 h-1.5 rounded-full bg-white/60"></div>
          <div className="w-1.5 h-1.5 rounded-full bg-white/60"></div>
          <div className="w-1.5 h-1.5 rounded-full bg-white/60"></div>
        </div>
      </div>

      {/* Card Content Body - Minimalist Typography */}
      <div className="p-3 sm:p-4 flex-1 flex flex-col justify-between">
        <div>
          {/* Property Title */}
          <h3 className="text-base sm:text-lg font-black text-slate-900 group-hover:text-brand-500 transition-colors line-clamp-1">
            ApnaGhar {listing.configuration || '2BHK'} - {listing.neighborhood || 'Bengaluru'}
          </h3>

          {/* Location Tag */}
          <div className="flex items-center gap-1 text-slate-500 text-xs font-semibold mt-1">
            <MapPin className="w-3.5 h-3.5 text-brand-500 flex-shrink-0" />
            <span className="truncate">{listing.neighborhood || 'Electronic City Phase 1, Bengaluru'}</span>
          </div>
        </div>

        {/* Price Tag Row */}
        <div className="flex items-center justify-between pt-3 mt-2 border-t border-slate-100">
          <div className="flex items-baseline gap-1">
            <span className="text-brand-500 font-black text-xl sm:text-2xl">
              ₹{listing.rent_amount ? listing.rent_amount.toLocaleString('en-IN') : '25,000'}
            </span>
            <span className="text-xs font-bold text-slate-400">/ month</span>
          </div>

          <div className="bg-brand-50 text-brand-600 hover:bg-brand-500 hover:text-white px-3.5 py-1.5 rounded-full font-black text-xs transition-all">
            View
          </div>
        </div>
      </div>
    </div>
  );
}
