'use client';

import React from 'react';
import { Listing } from '@/types';
import { getMediaProxyUrl } from '@/lib/api';
import { MapPin, Camera, Heart, Maximize2, User, ArrowRight } from 'lucide-react';

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
      className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden cursor-pointer group flex flex-col"
    >
      {/* Top Image Container */}
      <div className="relative w-full h-52 bg-slate-100 overflow-hidden">
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

        {/* FOR RENT Badge */}
        <div className="absolute top-3 left-3 bg-brand-500 text-white text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-md shadow-sm">
          For Rent
        </div>

        {/* Media Count Badge */}
        {listing.media_files.length > 0 && (
          <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-xs text-white text-xs font-semibold px-2 py-0.5 rounded-md flex items-center gap-1">
            <Camera className="w-3 h-3" />
            <span>{listing.media_files.length}</span>
          </div>
        )}

        {/* Location Overlay at bottom of image */}
        <div className="absolute bottom-3 left-3 right-3 flex items-center gap-1.5 text-white text-xs font-medium bg-black/40 backdrop-blur-xs px-2.5 py-1 rounded-lg">
          <MapPin className="w-3.5 h-3.5 text-brand-500" />
          <span className="truncate">{listing.neighborhood || 'Bengaluru, KA'}</span>
        </div>
      </div>

      {/* Card Content Body */}
      <div className="p-5 flex-1 flex flex-col justify-between">
        <div>
          {/* Price Tag */}
          <div className="flex items-baseline gap-1 text-brand-500 font-black text-xl mb-1">
            <span>₹{listing.rent_amount ? listing.rent_amount.toLocaleString('en-IN') : '25,000'}</span>
            <span className="text-xs font-semibold text-slate-400">/month</span>
          </div>

          {/* Property Title */}
          <h3 className="text-base font-bold text-slate-900 group-hover:text-brand-500 transition-colors line-clamp-1 mb-2">
            Modern {listing.configuration || '2 BHK'} Apartment
          </h3>

          <p className="text-xs text-slate-500 line-clamp-2 mb-4 leading-relaxed">
            Beautiful space in the heart of {listing.neighborhood || 'Bengaluru'}. Verified property listing.
          </p>

          {/* Specs Grid Bar */}
          <div className="grid grid-cols-3 gap-2 py-3 border-t border-b border-slate-100 text-xs text-slate-600 mb-4">
            <div className="flex flex-col items-center justify-center text-center">
              <span className="font-bold text-slate-900">{listing.configuration || '2 BHK'}</span>
              <span className="text-[10px] text-slate-400">Type</span>
            </div>
            <div className="flex flex-col items-center justify-center text-center border-x border-slate-100">
              <span className="font-bold text-slate-900">2 Baths</span>
              <span className="text-[10px] text-slate-400">Bathrooms</span>
            </div>
            <div className="flex flex-col items-center justify-center text-center">
              <span className="font-bold text-slate-900">1,250</span>
              <span className="text-[10px] text-slate-400">Sq Ft</span>
            </div>
          </div>
        </div>

        {/* Footer Row */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-brand-50 border border-brand-100 flex items-center justify-center text-brand-500">
              <User className="w-4 h-4" />
            </div>
            <span className="text-xs font-semibold text-slate-700">Verified Partner</span>
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              if (onSelect) onSelect(listing);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand-50 hover:bg-brand-100 text-brand-600 font-bold text-xs transition-colors"
          >
            <span>View Details</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
