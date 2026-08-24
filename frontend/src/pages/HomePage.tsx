import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../api/client';
import { Film, Music, MapPin, Calendar, ArrowRight, ShieldCheck } from 'lucide-react';

export const HomePage: React.FC = () => {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch('/events')
      .then((data) => setEvents(data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-16 pb-16">
      {/* Hero Banner */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-950 border border-indigo-500/20 p-8 sm:p-16 shadow-2xl">
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="max-w-3xl space-y-6 relative z-10">
          <div className="inline-flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/30 px-3.5 py-1.5 rounded-full text-xs font-semibold text-indigo-400">
            <ShieldCheck className="w-4 h-4" />
            <span>Real-Time Seat Locks & Instant QR Tickets</span>
          </div>
          <h1 className="text-4xl sm:text-6xl font-extrabold text-white tracking-tight leading-tight">
            Book Blockbuster Movies & Live Concerts Instantly.
          </h1>
          <p className="text-lg text-slate-300">
            Select your seats on an interactive live map. Concurrency-protected holds guarantee your seats while you checkout.
          </p>
          <div className="flex flex-wrap items-center gap-4 pt-2">
            <Link
              to="/events"
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-6 py-3.5 rounded-xl shadow-lg shadow-indigo-600/30 flex items-center gap-2 transition"
            >
              <span>Explore Events</span>
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Featured Events Grid */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-100">Featured Shows & Events</h2>
            <p className="text-sm text-slate-400">Handpicked upcoming movies and live performances</p>
          </div>
          <Link to="/events" className="text-indigo-400 hover:text-indigo-300 font-semibold text-sm flex items-center gap-1">
            View All →
          </Link>
        </div>

        {loading ? (
          <div className="text-center py-12 text-slate-400">Loading events...</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.slice(0, 6).map((event) => (
              <Link
                key={event.id}
                to={`/events/${event.id}`}
                className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden hover:border-indigo-500/50 hover:shadow-xl hover:shadow-indigo-500/10 transition group flex flex-col"
              >
                <div className="relative h-56 bg-slate-950 overflow-hidden">
                  <img
                    src={event.posterUrl || 'https://images.unsplash.com/photo-1536440136628-849c177e76a1'}
                    alt={event.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                  />
                  <span className="absolute top-3 left-3 bg-slate-950/80 backdrop-blur-md border border-slate-700 px-3 py-1 rounded-lg text-xs font-bold text-indigo-300 uppercase tracking-wider flex items-center gap-1">
                    {event.eventType === 'MOVIE' ? <Film className="w-3.5 h-3.5" /> : <Music className="w-3.5 h-3.5" />}
                    {event.eventType}
                  </span>
                </div>

                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div>
                    <h3 className="font-bold text-lg text-slate-100 group-hover:text-indigo-400 transition">
                      {event.title}
                    </h3>
                    <p className="text-xs text-slate-400 line-clamp-2 mt-1">{event.description}</p>
                  </div>

                  <div className="space-y-2 pt-3 border-t border-slate-800/80 text-xs text-slate-300">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-indigo-400" />
                      <span>{new Date(event.date).toLocaleDateString()} at {event.startTime}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-indigo-400" />
                      <span>{event.venue.name}, {event.venue.city}</span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
