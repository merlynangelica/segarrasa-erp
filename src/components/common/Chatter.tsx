import React, { useState } from 'react';
import { MessageSquare, Clock, User as UserIcon, Send, ShieldCheck } from 'lucide-react';
import { useErp } from '../../store/erpContext';

interface NoteItem {
  actor: string;
  timestamp: string;
  action: string;
  details?: string;
}

interface ChatterProps {
  documentId: string;
  notes: NoteItem[];
  onAddNote?: (note: string) => void;
}

export const Chatter: React.FC<ChatterProps> = ({ documentId, notes, onAddNote }) => {
  const { currentUser } = useErp();
  const [newNote, setNewNote] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim()) return;
    if (onAddNote) {
      onAddNote(newNote.trim());
      setNewNote('');
    }
  };

  return (
    <div className="bg-slate-50 border-t border-slate-200 p-6 mt-8 rounded-b-xl">
      <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
        <div className="flex items-center gap-2 text-slate-800 font-semibold text-sm">
          <MessageSquare className="w-4 h-4 text-brand-700" />
          <span>Riwayat Aktivitas & Catatan Audit (Log Notes)</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Jejak Audit Idempoten (SR-15)</span>
        </div>
      </div>

      {/* Input new note */}
      {onAddNote && (
        <form onSubmit={handleSubmit} className="mb-5 flex gap-2">
          <input
            type="text"
            value={newNote}
            onChange={e => setNewNote(e.target.value)}
            placeholder={`Tulis catatan internal atau log untuk ${documentId}...`}
            className="flex-1 px-3.5 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-brand-500"
          />
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-brand-800 hover:bg-brand-900 text-white text-xs font-medium rounded-lg transition"
          >
            <Send className="w-3.5 h-3.5" />
            Kirim
          </button>
        </form>
      )}

      {/* List notes */}
      <div className="space-y-3">
        {notes.length === 0 ? (
          <div className="text-center py-4 text-xs text-slate-400">
            Belum ada catatan aktivitas untuk dokumen ini.
          </div>
        ) : (
          notes.map((item, index) => (
            <div key={index} className="flex gap-3 text-xs bg-white p-3 rounded-lg border border-slate-200/80 shadow-2xs">
              <div className="w-7 h-7 rounded-full bg-brand-100 text-brand-800 flex items-center justify-center font-bold text-xs shrink-0">
                {item.actor.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-800">{item.actor}</span>
                  <span className="flex items-center gap-1 text-[11px] text-slate-400">
                    <Clock className="w-3 h-3" />
                    {item.timestamp}
                  </span>
                </div>
                <p className="text-slate-700 mt-1 leading-relaxed">{item.action}</p>
                {item.details && (
                  <p className="text-slate-500 text-[11px] mt-1 bg-slate-50 p-1.5 rounded border border-slate-100">
                    {item.details}
                  </p>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
