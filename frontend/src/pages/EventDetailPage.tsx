import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { apiFetch } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Calendar, Clock, MapPin, Ticket, ShieldCheck, UserCheck } from 'lucide-react';

export const EventDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [waitlistMsg, setWaitlistMsg] = useState('');
  const [joiningWaitlist, setJoiningWaitlist] = useState(false);

  useEffect(() => {
    if (id) {
      apiFetch(`/events/${id}`)
        .then(setEvent)
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [id]);

  const handleJoinWaitlist = async (category: string) => {
    if (!user) {
      navigate('/login');
      return;
    }
    setJoiningWaitlist(true);
    setWaitlistMsg('');
    try {
      const res = await apiFetch(`/events/${id}/waitlist`, {
        method: 'POST',
        body: JSON.stringify({ category }),
      });
      setWaitlistMsg(`✅ ${res.message} (Position: ${res.waitlistEntry.position})`);
    } catch (err: any) {
      setWaitlistMsg(`❌ ${err.message}`);
    } finally {
      setJoiningWaitlist(false);
    }
  };

  if (loading) return <div className="py-20 text-center text-slate-400">Loading show details...</div>;
  if (!event) return <div className="py-20 text-center text-slate-400">Event not found</div>;

  const prices = event.categoryPrices || {};
  const availableSeatsCount = event.eventSeats?.filter((s: any) => s.status === 'AVAILABLE').length || 0;
  const totalSeatsCount = event.eventSeats?.length || 0;
  const isSoldOut = availableSeatsCount === 0;

  return (
    <div className="space-y-8 pb-16">
      {/* Event Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row gap-8 shadow-2xl">
        <div className="w-full md:w-72 h-96 bg-slate-950 rounded-2xl overflow-hidden shadow-lg border border-slate-800 flex-shrink-0">
          <img
            src={event.posterUrl || 'https://images.unsplash.com/photo-1536440136628-849c177e76a1'}
            alt={event.title}
            className="w-full h-full object-cover"
          />
        </div>

        <div className="flex-1 flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/30 px-3 py-1 rounded-full text-xs font-bold text-indigo-400 uppercase tracking-wider">
              {event.eventType}
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-100">{event.title}</h1>
            <p className="text-slate-300 text-sm sm:text-base leading-relaxed">{event.description}</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4 border-y border-slate-800 text-sm">
            <div className="flex items-center gap-3 text-slate-300">
              <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs text-slate-400 block font-medium">Date</span>
                <span className="font-semibold">{new Date(event.date).toLocaleDateString()}</span>
              </div>
            </div>

            <div className="flex items-center gap-3 text-slate-300">
              <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs text-slate-400 block font-medium">Showtime</span>
                <span className="font-semibold">{event.startTime} {event.endTime ? `- ${event.endTime}` : ''}</span>
              </div>
            </div>

            <div className="flex items-center gap-3 text-slate-300 sm:col-span-2">
              <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs text-slate-400 block font-medium">Venue & Location</span>
                <span className="font-semibold">{event.venue.name} — {event.venue.address}, {event.venue.city}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between gap-4 pt-2">
            <div>
              <span className="text-xs text-slate-400 block font-medium">Availability</span>
              <span className={`text-sm font-bold ${isSoldOut ? 'text-rose-400' : 'text-emerald-400'}`}>
                {isSoldOut ? 'SOLD OUT' : `${availableSeatsCount} / ${totalSeatsCount} Seats Available`}
              </span>
            </div>

            <Link
              to={`/events/${event.id}/select-seats`}
              className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-3.5 rounded-xl font-bold text-sm shadow-lg shadow-indigo-600/30 flex items-center gap-2 transition"
            >
              <Ticket className="w-5 h-5" />
              <span>Select Seats Now</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Pricing & Waitlist Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <h3 className="text-lg font-bold text-slate-100">Seat Categories & Pricing</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-amber-950/30 border border-amber-500/30 p-4 rounded-xl space-y-1">
              <span className="text-xs font-bold text-amber-400 uppercase tracking-wider block">VIP Category</span>
              <span className="text-2xl font-extrabold text-amber-200">₹{prices.VIP || 500}</span>
              <p className="text-[11px] text-amber-400/80">Front row premium seating</p>
            </div>

            <div className="bg-sky-950/30 border border-sky-500/30 p-4 rounded-xl space-y-1">
              <span className="text-xs font-bold text-sky-400 uppercase tracking-wider block">PREMIUM Category</span>
              <span className="text-2xl font-extrabold text-sky-200">₹{prices.PREMIUM || 350}</span>
              <p className="text-[11px] text-sky-400/80">Middle row optimal view</p>
            </div>

            <div className="bg-emerald-950/30 border border-emerald-500/30 p-4 rounded-xl space-y-1">
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider block">STANDARD Category</span>
              <span className="text-2xl font-extrabold text-emerald-200">₹{prices.STANDARD || 200}</span>
              <p className="text-[11px] text-emerald-400/80">General auditorium seating</p>
            </div>
          </div>
        </div>

        {/* Waitlist Box */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-indigo-400" />
              Join Category Waitlist
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              If your preferred category is sold out or low in stock, join the FIFO queue to get automated time-limited offers when cancellations occur.
            </p>
          </div>

          {waitlistMsg && (
            <div className="text-xs p-3 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 font-semibold">
              {waitlistMsg}
            </div>
          )}

          <div className="space-y-2">
            <button
              onClick={() => handleJoinWaitlist('VIP')}
              disabled={joiningWaitlist}
              className="w-full bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-semibold py-2 rounded-lg border border-amber-500/30 transition"
            >
              Waitlist VIP (₹{prices.VIP || 500})
            </button>
            <button
              onClick={() => handleJoinWaitlist('PREMIUM')}
              disabled={joiningWaitlist}
              className="w-full bg-slate-800 hover:bg-slate-700 text-sky-300 text-xs font-semibold py-2 rounded-lg border border-sky-500/30 transition"
            >
              Waitlist PREMIUM (₹{prices.PREMIUM || 350})
            </button>
            <button
              onClick={() => handleJoinWaitlist('STANDARD')}
              disabled={joiningWaitlist}
              className="w-full bg-slate-800 hover:bg-slate-700 text-emerald-300 text-xs font-semibold py-2 rounded-lg border border-emerald-500/30 transition"
            >
              Waitlist STANDARD (₹{prices.STANDARD || 200})
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
