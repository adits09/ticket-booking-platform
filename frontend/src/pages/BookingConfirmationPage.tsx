import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { apiFetch } from '../api/client';
import { CheckCircle2, Ticket, Calendar, MapPin, Mail, Download, ArrowLeft } from 'lucide-react';

export const BookingConfirmationPage: React.FC = () => {
  const { id } = useParams<{ id: string }>(); // bookingId
  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      apiFetch(`/bookings/${id}`)
        .then(setBooking)
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [id]);

  if (loading) return <div className="py-20 text-center text-slate-400">Retrieving digital ticket...</div>;
  if (!booking) return <div className="py-20 text-center text-slate-400">Booking not found</div>;

  const seatsList = booking.bookingSeats.map(
    (bs: any) => `${bs.eventSeat.rowLabel}${bs.eventSeat.seatNumber}`
  );

  return (
    <div className="max-w-2xl mx-auto space-y-8 pb-16">
      {/* Top Banner */}
      <div className="text-center space-y-3">
        <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-2xl flex items-center justify-center mx-auto shadow-xl">
          <CheckCircle2 className="w-10 h-10" />
        </div>
        <h1 className="text-3xl font-extrabold text-slate-100">Booking Confirmed!</h1>
        <p className="text-sm text-slate-400">
          Booking Reference: <span className="font-mono text-indigo-400 font-bold">{booking.bookingReference}</span>
        </p>
      </div>

      {/* Confirmation Email Alert */}
      <div className="bg-indigo-950/40 border border-indigo-500/40 text-indigo-200 p-4 rounded-xl text-xs font-semibold flex items-center gap-3">
        <Mail className="w-5 h-5 text-indigo-400 flex-shrink-0" />
        <span>A copy of your QR ticket has been sent to <strong>{booking.user.email}</strong>.</span>
      </div>

      {/* Digital QR Ticket Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
        <div className="bg-gradient-to-r from-indigo-900 via-indigo-950 to-slate-950 p-6 text-white border-b border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-xs uppercase font-bold tracking-widest text-indigo-300">Digital Entry Pass</span>
            <h2 className="text-xl font-bold mt-1">{booking.event.title}</h2>
          </div>
          <Ticket className="w-8 h-8 text-indigo-400" />
        </div>

        <div className="p-8 space-y-8">
          <div className="grid grid-cols-2 gap-6 text-sm">
            <div>
              <span className="text-xs text-slate-400 font-medium block">Customer Name</span>
              <span className="font-bold text-slate-200">{booking.user.name}</span>
            </div>
            <div>
              <span className="text-xs text-slate-400 font-medium block">Seats</span>
              <span className="font-bold text-indigo-400">{seatsList.join(', ')}</span>
            </div>
            <div>
              <span className="text-xs text-slate-400 font-medium block">Date & Time</span>
              <span className="font-bold text-slate-200">
                {new Date(booking.event.date).toLocaleDateString()} at {booking.event.startTime}
              </span>
            </div>
            <div>
              <span className="text-xs text-slate-400 font-medium block">Venue</span>
              <span className="font-bold text-slate-200">{booking.event.venue.name}</span>
            </div>
          </div>

          {/* QR Code Container */}
          <div className="flex flex-col items-center justify-center p-6 bg-slate-950 rounded-2xl border border-slate-800">
            <img
              src={booking.qrCodeData}
              alt="QR Ticket Code"
              className="w-48 h-48 rounded-xl p-2 bg-white shadow-xl"
            />
            <span className="text-xs font-mono text-slate-400 mt-4 tracking-widest uppercase">
              {booking.bookingReference}
            </span>
            <span className="text-[11px] text-slate-500 mt-1">Scan at venue entrance for entry</span>
          </div>
        </div>

        <div className="bg-slate-950/60 p-4 text-center border-t border-slate-800 text-xs text-slate-400 flex items-center justify-between px-8">
          <span>Total Paid: <strong className="text-emerald-400 font-bold">₹{booking.totalPrice.toFixed(2)}</strong></span>
          <Link to="/my-bookings" className="text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1">
            <ArrowLeft className="w-4 h-4" /> View All My Bookings
          </Link>
        </div>
      </div>
    </div>
  );
};
