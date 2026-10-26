'use client';

import React from 'react';
import { Listing } from '@/types';
import { FileText, Image as ImageIcon, ArrowRight, Clock, PlusCircle } from 'lucide-react';

interface DraftsListProps {
  drafts: Listing[];
  onSelectDraft: (draft: Listing) => void;
}

export default function DraftsList({ drafts, onSelectDraft }: DraftsListProps) {
  return (
    <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm flex flex-col h-full">
      <div className="flex items-center justify-between mb-5 pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <span className="bg-brand-50 text-brand-500 text-xs font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-md border border-brand-100">
              Ingestion Queue
            </span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 mt-1">Pending Drafts</h2>
        </div>
        <span className="bg-brand-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-xs">
          {drafts.length}
        </span>
      </div>

      {drafts.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-slate-400 border-2 border-dashed border-slate-100 rounded-2xl bg-slate-50/50">
          <Clock className="w-12 h-12 mb-3 text-brand-500/40" />
          <p className="text-base font-bold text-slate-700">No Pending Drafts</p>
          <p className="text-xs text-slate-400 mt-1 max-w-xs leading-relaxed">
            Share photos or videos directly from native Android Gallery or WhatsApp to ingest media here.
          </p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto space-y-3.5 pr-1">
          {drafts.map((draft) => (
            <div
              key={draft.id}
              className="group border border-slate-100 bg-slate-50/80 hover:bg-brand-50/40 hover:border-brand-200 rounded-2xl p-4 transition-all duration-200 cursor-pointer shadow-xs hover:shadow-md"
              onClick={() => onSelectDraft(draft)}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-extrabold text-brand-500 uppercase tracking-wider bg-white px-2 py-0.5 rounded-md border border-slate-100">
                  Draft #{draft.id.slice(0, 6)}
                </span>
                <span className="text-[11px] text-slate-400 font-medium">
                  {new Date(draft.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>

              <div className="flex items-center justify-between mt-3">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                  <ImageIcon className="w-4 h-4 text-brand-500" />
                  <span>{draft.media_files.length} Media Files Ingested</span>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectDraft(draft);
                  }}
                  className="flex items-center gap-1 text-xs font-bold text-white bg-brand-500 hover:bg-brand-600 px-3.5 py-1.5 rounded-xl shadow-xs transition-all"
                >
                  <span>Complete</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
