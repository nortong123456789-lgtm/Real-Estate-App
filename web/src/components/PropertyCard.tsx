'use client';

import React, { useState, useRef } from 'react';
import { Listing } from '@/types';
import { getMediaProxyUrl } from '@/lib/api';
import { MapPin, Camera, MessageCircle, ArrowUpRight } from 'lucide-react';

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
  const carouselRef = useRef<HTMLDivElement>(null);

  const handleWhatsAppContact = (e: React.MouseEvent) => {
    e.stopPropagation();
    const propTitle = listing.configuration || '2 BHK Apartment';
    const propPrice = formatPrice(listing.rent_amount);
    // Number: 9242786678 (No ID displayed as requested)
    const message = encodeURIComponent(
      `Hello! I am interested in your property listing "${propTitle}" priced at ₹${propPrice}/month in Bengaluru. Please share more details.`
    );
    window.open(`https://wa.me/919242786678?text=${message}`, '_blank');
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const scrollLeft = e.currentTarget.scrollLeft;
    const width = e.currentTarget.clientWidth;
    if (width > 0) {
      const index = Math.round(scrollLeft / width);
      setActiveMediaIndex(index);
    }
  };

  return (
    <div
      onClick={() => onSelect && onSelect(listing)}
      className="bg-white rounded-3xl p-3.5 sm:p-5 border border-slate-200/85 shadow-md hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 overflow-hidden cursor-pointer group flex flex-col w-full"
    >
      {/* Much Bigger Property Post Image with Smooth Horizontal Swiping Carousel */}
      <div className="relative w-full h-64 sm:h-80 md:h-96 bg-slate-900 rounded-2xl sm:rounded-3xl overflow-hidden shadow-inner">
        {mediaFiles.length > 0 ? (
          <div
            ref={carouselRef}
            onScroll={handleScroll}
            className="w-full h-full flex overflow-x-auto snap-x snap-mandatory scrollbar-none scroll-smooth touch-pan-x"
          >
            {mediaFiles.map((media, idx) => {
              const mediaUrl = getMediaProxyUrl(media);
              return (
                <div key={media.id || idx} className="w-full h-full flex-shrink-0 snap-center relative">
                  {media.file_type.startsWith('video') ? (
                    <video src={mediaUrl} className="w-full h-full object-cover" />
                  ) : (
                    <img
                      src={mediaUrl}
                      alt={listing.configuration || 'Property'}
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-slate-100 text-slate-400 p-4 text-center">
            <Camera className="w-10 h-10 mb-2 opacity-40 text-brand-500" />
            <span className="text-xs font-medium">No photo available</span>
          </div>
        )}

        {/* Swipe Instruction Badge on hover */}
        {mediaFiles.length > 1 && (
          <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-md text-white text-[10px] font-extrabold px-3 py-1 rounded-full flex items-center gap-1.5 shadow-md z-10 pointer-events-none">
            <Camera className="w-3 h-3 text-brand-500" />
            <span>{activeMediaIndex + 1} / {mediaFiles.length} (Swipe)</span>
          </div>
        )}

        {/* Dot Pagination Indicator */}
        {mediaFiles.length > 1 && (
          <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-black/40 backdrop-blur-md px-2.5 py-1 rounded-full z-10 pointer-events-none">
            {mediaFiles.map((_, idx) => (
              <div
                key={idx}
                className={`rounded-full transition-all ${
                  activeMediaIndex === idx ? 'w-3.5 h-1.5 bg-white' : 'w-1.5 h-1.5 bg-white/50'
                }`}
              />
            ))}
          </div>
        )}

        {/* Compact One-Line Tagline Overlay at Bottom of Image */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-3.5 sm:p-4 pt-8 text-white flex items-end justify-between pointer-events-none">
          <div className="min-w-0 pr-2">
            <h3 className="text-sm sm:text-base font-black tracking-tight truncate">
              {listing.configuration || '2 BHK Apartment'}
            </h3>
            <p className="text-[11px] sm:text-xs text-slate-200 font-medium truncate flex items-center gap-1 mt-0.5">
              <MapPin className="w-3 h-3 text-brand-400 flex-shrink-0" />
              <span>Bengaluru, Karnataka</span>
            </p>
          </div>

          <div className="text-right flex-shrink-0">
            <div className="text-base sm:text-lg font-black text-white leading-tight">
              ₹{formatPrice(listing.rent_amount)}<span className="text-[10px] font-normal text-slate-300">/mo</span>
            </div>
          </div>
        </div>
      </div>

      {/* Card Footer Bar - Smaller Font & Compact Action Buttons */}
      <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between text-xs">
        <span className="text-slate-500 font-medium text-[11px] truncate max-w-[55%]">
          {listing.description || 'Modern living space with excellent amenities.'}
        </span>

        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={handleWhatsAppContact}
            className="bg-emerald-500 hover:bg-emerald-600 text-white px-3.5 py-2 rounded-xl font-extrabold text-[11px] flex items-center gap-1.5 shadow-xs transition-all touch-target"
            title="Chat on WhatsApp"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            <span>WhatsApp</span>
          </button>

          <button
            onClick={() => onSelect && onSelect(listing)}
            className="bg-slate-900 hover:bg-black text-white px-3.5 py-2 rounded-xl font-extrabold text-[11px] flex items-center gap-1 transition-all touch-target"
          >
            <span>View</span>
            <ArrowUpRight className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
}
