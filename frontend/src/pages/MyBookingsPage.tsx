import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../api/client';
import { Calendar, Ticket, MapPin, XCircle, QrCode, AlertCircle } from 'lucide-react';

export const MyBookingsPage: React.FC = () => {
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [msg, setMsg] = useState('');

  const fetchBookings = () => {
    setLoading(true);
    apiFetch('/bookings')
      .then(setBookings)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const handleCancelBooking = async (bookingId: string) => {
    if (!window.confirm('Are you sure you want to cancel this booking? The seat will automatically be offered to the waitlist.')) {
      return;
    }
    setCancellingId(bookingId);
    setMsg('');
    try {
      const res = await apiFetch(`/bookings/${bookingId}/cancel`, { method: 'POST' });
      setMsg(`✅ ${res.message}`);
      fetchBookings();
    } catch (err: any) {
      setMsg(`❌ ${err.message}`);
    } finally {
      setCancellingId(null);
    }
  };

  if (loading) return <div className="py-20 text-center text-slate-400">Loading your bookings...</div>;

  return (
    <div className="space-y-8 pb-16">
      <div>
        <h1 className="text-3xl font-bold text-slate-100">My Booking History</h1>
        <p className="text-sm text-slate-400 mt-1">Manage your active tickets and past bookings</p>
      </div>

      {msg && (
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl text-sm font-semibold text-slate-200">
          {msg}
        </div>
      )}

      {bookings.length === 0 ? (
        <div className="text-center py-16 bg-slate-900 border border-slate-800 rounded-2xl space-y-4">
          <Ticket className="w-12 h-12 text-slate-600 mx-auto" />
          <p className="text-slate-400 text-sm">You have no active or past bookings.</p>
          <Link to="/events" className="inline-block bg-indigo-600 text-white text-xs font-bold px-4 py-2 rounded-xl">
            Browse Events
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {bookings.map((b) => {
            const isConfirmed = b.status === 'CONFIRMED';
            const seatLabels = b.bookingSeats.map(
              (bs: any) => `${bs.eventSeat.rowLabel}${bs.eventSeat.seatNumber}`
            );

            return (
              <div
                key={b.id}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-lg"
              >
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs font-bold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-1 rounded-md">
                      {b.bookingReference}
                    </span>
                    <span
                      className={`text-xs font-bold px-2 py-0.5 rounded ${
                        isConfirmed ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                      }`}
                    >
                      {b.status}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-slate-100">{b.event.title}</h3>

                  <div className="flex flex-wrap gap-4 text-xs text-slate-400">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                      {new Date(b.event.date).toLocaleDateString()} at {b.event.startTime}
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-indigo-400" />
                      {b.event.venue.name}
                    </span>
                  </div>

                  <div className="pt-2 text-xs">
                    <span className="text-slate-400">Seats: </span>
                    <strong className="text-slate-200">{seatLabels.join(', ')}</strong>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-3 w-full md:w-auto">
                  <span className="text-xl font-extrabold text-indigo-400">₹{b.totalPrice.toFixed(2)}</span>

                  <div className="flex items-center gap-2">
                    {isConfirmed && (
                      <>
                        <Link
                          to={`/booking/confirmation/${b.id}`}
                          className="bg-indigo-600 hover:bg-indigo-500 text-white px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
                        >
                          <QrCode className="w-4 h-4" /> View Ticket
                        </Link>
                        <button
                          onClick={() => handleCancelBooking(b.id)}
                          disabled={cancellingId === b.id}
                          className="bg-slate-800 hover:bg-rose-950/60 text-slate-300 hover:text-rose-400 border border-slate-700 hover:border-rose-500/40 px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
                        >
                          <XCircle className="w-4 h-4" /> Cancel
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
