import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../api/client';
import { ShieldCheck, Building2, Ticket, Users, Settings, Clock } from 'lucide-react';

export const AdminDashboardPage: React.FC = () => {
  const [venues, setVenues] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([apiFetch('/venues'), apiFetch('/events')])
      .then(([v, e]) => {
        setVenues(v);
        setEvents(e);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="py-20 text-center text-slate-400">Loading admin system statistics...</div>;

  return (
    <div className="space-y-8 pb-16">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-100 flex items-center gap-2">
            <ShieldCheck className="w-8 h-8 text-amber-400" />
            System Administration Panel
          </h1>
          <p className="text-sm text-slate-400 mt-1">Manage venues, seat layouts, and system-wide configurations</p>
        </div>

        <Link
          to="/admin/venues"
          className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-5 py-2.5 rounded-xl text-sm shadow-lg shadow-amber-500/20 flex items-center gap-2 transition w-fit"
        >
          <Building2 className="w-4 h-4" /> Manage Venues & Layouts
        </Link>
      </div>

      {/* System Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-2">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Registered Venues</span>
          <span className="text-3xl font-extrabold text-slate-100">{venues.length}</span>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-2">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Total Active Events</span>
          <span className="text-3xl font-extrabold text-indigo-400">{events.length}</span>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-2">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Default Seat Hold TTL</span>
          <span className="text-3xl font-extrabold text-amber-400">10 Mins</span>
        </div>
      </div>

      {/* Venues Overview */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-100">Venue Layout Registry</h2>
          <Link to="/admin/venues" className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold">
            View All Venues →
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {venues.map((v) => (
            <div key={v.id} className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-200">{v.name}</h3>
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  {v._count?.seats || (v.totalRows * v.seatsPerRow)} Seats
                </span>
              </div>
              <p className="text-xs text-slate-400">{v.address}, {v.city}</p>
              <p className="text-xs text-slate-500 pt-1">
                Grid: {v.totalRows} Rows × {v.seatsPerRow} Seats/Row
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
