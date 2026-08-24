import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../api/client';
import { Plus, Ticket, DollarSign, Users, Calendar, Percent, XCircle } from 'lucide-react';

export const OrganiserDashboardPage: React.FC = () => {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchEvents = () => {
    apiFetch('/events/organiser/my-events')
      .then(setEvents)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const handleCancelEvent = async (eventId: string) => {
    if (!window.confirm('Are you sure you want to cancel this event?')) return;
    try {
      await apiFetch(`/events/${eventId}`, { method: 'DELETE' });
      fetchEvents();
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (loading) return <div className="py-20 text-center text-slate-400">Loading organiser analytics...</div>;

  const totalEvents = events.length;
  const totalTicketsSold = events.reduce((sum, e) => sum + e.ticketsSold, 0);
  const totalRevenue = events.reduce((sum, e) => sum + e.totalRevenue, 0);
  const avgOccupancy = totalEvents > 0
    ? (events.reduce((sum, e) => sum + parseFloat(e.occupancyPercentage), 0) / totalEvents).toFixed(1)
    : 0;

  return (
    <div className="space-y-8 pb-16">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-100">Organiser Dashboard</h1>
          <p className="text-sm text-slate-400 mt-1">Manage your event listings and view live revenue analytics</p>
        </div>

        <Link
          to="/organiser/events/create"
          className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-5 py-2.5 rounded-xl text-sm shadow-lg shadow-indigo-600/30 flex items-center gap-2 transition w-fit"
        >
          <Plus className="w-4 h-4" /> Create New Event
        </Link>
      </div>

      {/* Analytics Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Total Hosted Events</span>
            <Calendar className="w-5 h-5 text-indigo-400" />
          </div>
          <span className="text-3xl font-extrabold text-slate-100">{totalEvents}</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Tickets Sold</span>
            <Ticket className="w-5 h-5 text-emerald-400" />
          </div>
          <span className="text-3xl font-extrabold text-slate-100">{totalTicketsSold}</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Gross Revenue</span>
            <DollarSign className="w-5 h-5 text-amber-400" />
          </div>
          <span className="text-3xl font-extrabold text-emerald-400">₹{totalRevenue.toFixed(2)}</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Avg Occupancy Rate</span>
            <Percent className="w-5 h-5 text-sky-400" />
          </div>
          <span className="text-3xl font-extrabold text-indigo-400">{avgOccupancy}%</span>
        </div>
      </div>

      {/* Events Breakdown Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-5 border-b border-slate-800 font-bold text-slate-100">
          Your Listed Events & Show Analytics
        </div>

        {events.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-sm">
            No events created yet. Click "Create New Event" to start listing shows!
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-950/80 text-xs uppercase text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="px-6 py-3.5">Event Title</th>
                  <th className="px-6 py-3.5">Venue</th>
                  <th className="px-6 py-3.5">Date & Time</th>
                  <th className="px-6 py-3.5">Capacity</th>
                  <th className="px-6 py-3.5">Tickets Sold</th>
                  <th className="px-6 py-3.5">Revenue</th>
                  <th className="px-6 py-3.5">Occupancy</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {events.map((e) => (
                  <tr key={e.id} className="hover:bg-slate-800/40 transition">
                    <td className="px-6 py-4 font-semibold text-slate-100">{e.title}</td>
                    <td className="px-6 py-4 text-xs text-slate-400">{e.venueName}</td>
                    <td className="px-6 py-4 text-xs">
                      {new Date(e.date).toLocaleDateString()} {e.startTime}
                    </td>
                    <td className="px-6 py-4 text-xs font-semibold">{e.totalCapacity}</td>
                    <td className="px-6 py-4 text-xs font-semibold text-emerald-400">{e.ticketsSold}</td>
                    <td className="px-6 py-4 text-xs font-extrabold text-amber-400">₹{e.totalRevenue.toFixed(2)}</td>
                    <td className="px-6 py-4 text-xs">
                      <span className="px-2 py-1 rounded bg-indigo-500/10 text-indigo-300 font-bold border border-indigo-500/20">
                        {e.occupancyPercentage}%
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {!e.isCancelled ? (
                        <button
                          onClick={() => handleCancelEvent(e.id)}
                          className="text-rose-400 hover:text-rose-300 text-xs font-semibold flex items-center gap-1 ml-auto"
                        >
                          <XCircle className="w-3.5 h-3.5" /> Cancel Show
                        </button>
                      ) : (
                        <span className="text-xs text-rose-500 font-bold">Cancelled</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
