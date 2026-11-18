'use client';

import React, { useState } from 'react';
import { Listing } from '@/types';
import { getMediaProxyUrl } from '@/lib/api';
import { MapPin, Camera, ChevronLeft, ChevronRight, MessageCircle } from 'lucide-react';

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
  const [activeMediaIndex, setActiveMediaIndex] = useState(0);

  const currentMedia = mediaFiles[activeMediaIndex];
  const mediaUrl = currentMedia ? getMediaProxyUrl(currentMedia) : null;

  const handleWhatsAppContact = (e: React.MouseEvent) => {
    e.stopPropagation();
    const propTitle = listing.configuration || '2 BHK Apartment';
    const propPrice = formatPrice(listing.rent_amount);
    const message = encodeURIComponent(
      `Hello! I am interested in your property listing "${propTitle}" priced at ₹${propPrice}/month in Bengaluru (ID: #${listing.id}). Please share more details.`
    );
    window.open(`https://wa.me/919876543210?text=${message}`, '_blank');
  };

  return (
    <div
      onClick={() => onSelect && onSelect(listing)}
      className="bg-white rounded-3xl p-3 sm:p-4 border border-slate-200/85 shadow-sm hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 overflow-hidden cursor-pointer group flex flex-col w-full"
    >
      {/* Larger Image Container with In-View Carousel */}
      <div className="relative w-full h-52 sm:h-64 bg-slate-900 rounded-2xl sm:rounded-3xl overflow-hidden shadow-inner">
        {mediaUrl ? (
          currentMedia?.file_type.startsWith('video') ? (
            <video src={mediaUrl} className="w-full h-full object-cover" />
          ) : (
            <img
              src={mediaUrl}
              alt={listing.configuration || 'Property'}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          )
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-slate-100 text-slate-400 p-4 text-center">
            <Camera className="w-8 h-8 mb-1 opacity-40 text-brand-500" />
            <span className="text-xs font-medium">No photo available</span>
          </div>
        )}

        {/* Carousel Navigation Arrows */}
        {mediaFiles.length > 1 && (
          <>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setActiveMediaIndex((prev) => (prev - 1 + mediaFiles.length) % mediaFiles.length);
              }}
              className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-black/60 text-white hover:bg-black/80 transition-all opacity-0 group-hover:opacity-100"
              title="Previous Photo"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setActiveMediaIndex((prev) => (prev + 1) % mediaFiles.length);
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-black/60 text-white hover:bg-black/80 transition-all opacity-0 group-hover:opacity-100"
              title="Next Photo"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            {/* Dot Pagination Indicator */}
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-black/50 backdrop-blur-md px-2.5 py-1 rounded-full">
              {mediaFiles.map((_, idx) => (
                <div
                  key={idx}
                  className={`rounded-full transition-all ${
                    activeMediaIndex === idx ? 'w-3 h-1.5 bg-white' : 'w-1.5 h-1.5 bg-white/50'
                  }`}
                />
              ))}
            </div>
          </>
        )}

        {/* Media Counter Badge */}
        {mediaFiles.length > 0 && (
          <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-md text-white text-[10px] font-extrabold px-2.5 py-1 rounded-full flex items-center gap-1 shadow-md">
            <Camera className="w-3 h-3 text-brand-500" />
            <span>{activeMediaIndex + 1} / {mediaFiles.length}</span>
          </div>
        )}
      </div>

      {/* Card Content Body - Bigger Property Post with Essential Details & WhatsApp */}
      <div className="p-3.5 sm:p-4 flex-1 flex flex-col justify-between">
        <div>
          {/* Property Title */}
          <h3 className="text-base sm:text-lg font-black text-slate-900 group-hover:text-brand-500 transition-colors line-clamp-1">
            {listing.configuration || '2 BHK Apartment'}
          </h3>

          {/* Location Tag */}
          <div className="flex items-center gap-1 text-slate-500 text-xs font-semibold mt-1">
            <MapPin className="w-3.5 h-3.5 text-brand-500 flex-shrink-0" />
            <span className="truncate">Bengaluru, Karnataka</span>
          </div>

          {/* Public Description Preview */}
          {listing.description && (
            <p className="text-xs text-slate-500 line-clamp-2 mt-2 leading-relaxed font-normal">
              {listing.description}
            </p>
          )}
        </div>

        {/* Price Tag & WhatsApp Contact Row */}
        <div className="flex items-center justify-between pt-3.5 mt-3.5 border-t border-slate-100">
          <div className="flex items-baseline gap-1">
            <span className="text-brand-500 font-black text-xl sm:text-2xl">
              ₹{formatPrice(listing.rent_amount)}
            </span>
            <span className="text-xs font-bold text-slate-400">/mo</span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={handleWhatsAppContact}
              className="bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-2 rounded-xl font-extrabold text-xs flex items-center gap-1.5 shadow-sm transition-all"
              title="Contact Broker on WhatsApp"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">WhatsApp</span>
            </button>

            <div className="bg-brand-50 text-brand-600 group-hover:bg-brand-500 group-hover:text-white px-3.5 py-2 rounded-xl font-black text-xs transition-all">
              Details
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
