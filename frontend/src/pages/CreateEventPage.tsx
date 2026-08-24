import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../api/client';
import { Film, Calendar, MapPin, DollarSign, PlusCircle, AlertCircle } from 'lucide-react';

export const CreateEventPage: React.FC = () => {
  const navigate = useNavigate();
  const [venues, setVenues] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [eventType, setEventType] = useState<'MOVIE' | 'CONCERT' | 'OTHER'>('MOVIE');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('19:00');
  const [endTime, setEndTime] = useState('21:30');
  const [posterUrl, setPosterUrl] = useState('');
  const [venueId, setVenueId] = useState('');

  // Category Pricing
  const [vipPrice, setVipPrice] = useState(500);
  const [premiumPrice, setPremiumPrice] = useState(350);
  const [standardPrice, setStandardPrice] = useState(200);

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    apiFetch('/venues')
      .then((data) => {
        setVenues(data);
        if (data.length > 0) setVenueId(data[0].id);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!venueId) {
      setErrorMsg('Please select a venue');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');

    try {
      await apiFetch('/events', {
        method: 'POST',
        body: JSON.stringify({
          title,
          description,
          eventType,
          date,
          startTime,
          endTime,
          posterUrl,
          venueId,
          categoryPrices: {
            VIP: Number(vipPrice),
            PREMIUM: Number(premiumPrice),
            STANDARD: Number(standardPrice),
          },
        }),
      });

      navigate('/organiser/dashboard');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to create event');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="py-20 text-center text-slate-400">Loading venue layouts...</div>;

  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-16">
      <div>
        <h1 className="text-3xl font-bold text-slate-100">Create Event Listing</h1>
        <p className="text-sm text-slate-400 mt-1">
          Select a venue layout to automatically generate event seat inventory and set prices
        </p>
      </div>

      {errorMsg && (
        <div className="bg-rose-950/40 border border-rose-500/50 text-rose-300 p-4 rounded-xl text-sm font-semibold flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-slate-900 border border-slate-800 p-8 rounded-3xl space-y-6 shadow-2xl">
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-slate-100 pb-2 border-b border-slate-800">
            Basic Event Information
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="text-xs font-semibold text-slate-400 block mb-1.5">Event Title</label>
              <input
                type="text"
                required
                placeholder="e.g. Inception 10th Anniversary IMAX"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="text-xs font-semibold text-slate-400 block mb-1.5">Description</label>
              <textarea
                rows={3}
                required
                placeholder="Enter event plot, artist lineup, or show highlights..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-400 block mb-1.5">Event Type</label>
              <select
                value={eventType}
                onChange={(e) => setEventType(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                <option value="MOVIE">Movie</option>
                <option value="CONCERT">Live Concert</option>
                <option value="OTHER">Other Performance</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-400 block mb-1.5">Poster Image URL</label>
              <input
                type="url"
                placeholder="https://images.unsplash.com/..."
                value={posterUrl}
                onChange={(e) => setPosterUrl(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* Date, Time & Venue */}
        <div className="space-y-4 pt-4 border-t border-slate-800">
          <h3 className="text-lg font-bold text-slate-100 pb-2 border-b border-slate-800">
            Schedule & Venue Selection
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-400 block mb-1.5">Event Date</label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-400 block mb-1.5">Start Time</label>
              <input
                type="text"
                required
                placeholder="19:00"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-400 block mb-1.5">End Time</label>
              <input
                type="text"
                placeholder="21:30"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="sm:col-span-3">
              <label className="text-xs font-semibold text-slate-400 block mb-1.5">Venue</label>
              <select
                value={venueId}
                onChange={(e) => setVenueId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                {venues.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name} ({v.city}) — {v._count?.seats || (v.totalRows * v.seatsPerRow)} Total Seats
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Pricing Config */}
        <div className="space-y-4 pt-4 border-t border-slate-800">
          <h3 className="text-lg font-bold text-slate-100 pb-2 border-b border-slate-800">
            Seat Category Pricing (₹)
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-amber-950/20 border border-amber-500/30 p-4 rounded-xl">
              <label className="text-xs font-bold text-amber-400 uppercase tracking-wider block mb-1">VIP Seat Price</label>
              <input
                type="number"
                required
                min={0}
                value={vipPrice}
                onChange={(e) => setVipPrice(parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-amber-200 font-bold"
              />
            </div>

            <div className="bg-sky-950/20 border border-sky-500/30 p-4 rounded-xl">
              <label className="text-xs font-bold text-sky-400 uppercase tracking-wider block mb-1">PREMIUM Seat Price</label>
              <input
                type="number"
                required
                min={0}
                value={premiumPrice}
                onChange={(e) => setPremiumPrice(parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-sky-200 font-bold"
              />
            </div>

            <div className="bg-emerald-950/20 border border-emerald-500/30 p-4 rounded-xl">
              <label className="text-xs font-bold text-emerald-400 uppercase tracking-wider block mb-1">STANDARD Seat Price</label>
              <input
                type="number"
                required
                min={0}
                value={standardPrice}
                onChange={(e) => setStandardPrice(parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-emerald-200 font-bold"
              />
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 transition text-sm pt-3"
        >
          <PlusCircle className="w-5 h-5" />
          <span>{submitting ? 'Generating Event Seat Inventory...' : 'Create & Publish Event'}</span>
        </button>
      </form>
    </div>
  );
};
