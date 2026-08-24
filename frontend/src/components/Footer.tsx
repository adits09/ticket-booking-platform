import React from 'react';
import { Ticket } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-slate-950 border-t border-slate-900 py-8 px-4 text-center text-slate-500 text-sm mt-auto">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-slate-400 font-semibold">
          <Ticket className="w-5 h-5 text-indigo-400" />
          <span>CinePass Ticket Booking Platform</span>
        </div>
        <p>© 2026 Production Ticket Booking System. Built with Concurrency Safety & Real-Time WebSockets.</p>
      </div>
    </footer>
  );
};
