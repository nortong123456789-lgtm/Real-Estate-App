'use client';

import React from 'react';
import { Listing } from '@/types';
import { getMediaProxyUrl } from '@/lib/api';
import { MapPin, Camera } from 'lucide-react';

interface PropertyCardProps {
  listing: Listing;
  onSelect?: (listing: Listing) => void;
}

// Safe Price Formatter
function formatPrice(amount?: number | string | null): string {
  if (!amount) return '25,000';
  const num = typeof amount === 'number' ? amount : parseFloat(String(amount));
  if (isNaN(num)) return '25,000';
  try {
    return num.toLocaleString('en-IN');
  } catch (e) {
    return String(num);
  }
}

export default function PropertyCard({ listing, onSelect }: PropertyCardProps) {
  const mediaFiles = listing.media_files || [];
  const primaryMedia = mediaFiles[0];
  const mediaUrl = primaryMedia ? getMediaProxyUrl(primaryMedia) : null;

  return (
    <div
      onClick={() => onSelect && onSelect(listing)}
      className="bg-white rounded-2xl p-2.5 sm:p-3 border border-slate-100 shadow-2xs hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200 overflow-hidden cursor-pointer group flex flex-col w-full"
    >
      {/* Compact Top Image Container */}
      <div className="relative w-full h-36 sm:h-44 bg-slate-100 rounded-xl overflow-hidden">
        {mediaUrl ? (
          <img
            src={mediaUrl}
            alt={listing.configuration || 'Property'}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-slate-100 text-slate-400 p-2 text-center">
            <Camera className="w-6 h-6 mb-1 opacity-40 text-brand-500" />
            <span className="text-[10px] font-medium">No photo</span>
          </div>
        )}

        {/* Media Counter Badge */}
        {mediaFiles.length > 0 && (
          <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-md text-white text-[9px] font-extrabold px-2 py-0.5 rounded-full flex items-center gap-1">
            <Camera className="w-2.5 h-2.5 text-brand-500" />
            <span>{mediaFiles.length}</span>
          </div>
        )}
      </div>

      {/* Card Content Body - Compact Essential Details */}
      <div className="p-2.5 sm:p-3 flex-1 flex flex-col justify-between">
        <div>
          {/* Property Title */}
          <h3 className="text-sm sm:text-base font-black text-slate-900 group-hover:text-brand-500 transition-colors line-clamp-1">
            {listing.configuration || '2 BHK Apartment'}
          </h3>

          {/* Location Tag */}
          <div className="flex items-center gap-1 text-slate-500 text-[11px] font-semibold mt-0.5">
            <MapPin className="w-3 h-3 text-brand-500 flex-shrink-0" />
            <span className="truncate">Bengaluru, Karnataka</span>
          </div>
        </div>

        {/* Price Tag Row */}
        <div className="flex items-center justify-between pt-2.5 mt-2.5 border-t border-slate-100">
          <div className="flex items-baseline gap-1">
            <span className="text-brand-500 font-black text-base sm:text-lg">
              ₹{formatPrice(listing.rent_amount)}
            </span>
            <span className="text-[10px] font-bold text-slate-400">/mo</span>
          </div>

          <div className="bg-brand-50 text-brand-600 group-hover:bg-brand-500 group-hover:text-white px-2.5 py-1 rounded-full font-black text-[11px] transition-all">
            View
          </div>
        </div>
      </div>
    </div>
  );
}
