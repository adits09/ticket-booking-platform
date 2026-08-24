import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../api/client';
import { Search, Filter, Calendar, MapPin, Film, Music, RotateCcw } from 'lucide-react';

export const EventListingPage: React.FC = () => {
  const [events, setEvents] = useState<any[]>([]);
  const [venues, setVenues] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [eventType, setEventType] = useState('');
  const [venueId, setVenueId] = useState('');
  const [date, setDate] = useState('');

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (eventType) params.append('eventType', eventType);
      if (venueId) params.append('venueId', venueId);
      if (date) params.append('date', date);

      const data = await apiFetch(`/events?${params.toString()}`);
      setEvents(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    apiFetch('/venues').then(setVenues).catch(console.error);
    fetchEvents();
  }, []);

  const handleFilterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchEvents();
  };

  const handleClearFilters = () => {
    setSearch('');
    setEventType('');
    setVenueId('');
    setDate('');
    setLoading(true);
    apiFetch('/events')
      .then(setEvents)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  return (
    <div className="space-y-8 pb-16">
      <div>
        <h1 className="text-3xl font-bold text-slate-100">Browse Events & Movies</h1>
        <p className="text-sm text-slate-400 mt-1">Search, filter, and book your tickets</p>
      </div>

      {/* Filter Form */}
      <form onSubmit={handleFilterSubmit} className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex flex-wrap items-center gap-4">
        {/* Search */}
        <div className="flex-1 min-w-[200px]">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search movies, concerts..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 text-slate-200 rounded-xl pl-9 pr-4 py-2 text-sm focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        {/* Type Filter */}
        <select
          value={eventType}
          onChange={(e) => setEventType(e.target.value)}
          className="bg-slate-950 border border-slate-700 text-slate-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-indigo-500"
        >
          <option value="">All Categories</option>
          <option value="MOVIE">Movies</option>
          <option value="CONCERT">Concerts</option>
          <option value="OTHER">Other Events</option>
        </select>

        {/* Venue Filter */}
        <select
          value={venueId}
          onChange={(e) => setVenueId(e.target.value)}
          className="bg-slate-950 border border-slate-700 text-slate-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-indigo-500"
        >
          <option value="">All Venues</option>
          {venues.map((v) => (
            <option key={v.id} value={v.id}>{v.name}</option>
          ))}
        </select>

        {/* Date Filter */}
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="bg-slate-950 border border-slate-700 text-slate-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-indigo-500"
        />

        <button
          type="submit"
          className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2 rounded-xl font-semibold text-sm transition"
        >
          Filter
        </button>

        {(search || eventType || venueId || date) && (
          <button
            type="button"
            onClick={handleClearFilters}
            className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition border border-slate-700"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Clear Filters
          </button>
        )}
      </form>

      {/* Grid */}
      {loading ? (
        <div className="text-center py-12 text-slate-400">Loading events...</div>
      ) : events.length === 0 ? (
        <div className="text-center py-16 bg-slate-900/50 rounded-2xl border border-slate-800 space-y-4">
          <p className="text-slate-400 text-sm">No events found matching your filter criteria.</p>
          <button
            onClick={handleClearFilters}
            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-4 py-2 rounded-xl transition"
          >
            <RotateCcw className="w-4 h-4" /> Reset Filters & View All Upcoming Shows
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map((event) => (
            <Link
              key={event.id}
              to={`/events/${event.id}`}
              className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden hover:border-indigo-500/50 hover:shadow-xl transition group flex flex-col"
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
    </div>
  );
};
