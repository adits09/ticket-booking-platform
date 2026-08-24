import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { apiFetch } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { HoldCountdownBanner } from '../components/HoldCountdownBanner';
import { CreditCard, ShieldCheck, Ticket, CheckCircle2, AlertCircle } from 'lucide-react';

export const CheckoutPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const eventId = searchParams.get('eventId');
  const holdId = searchParams.get('holdId');

  const { user } = useAuth();
  const navigate = useNavigate();

  const [event, setEvent] = useState<any>(null);
  const [seats, setSeats] = useState<any[]>([]);
  const [hold, setHold] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Mock Payment state
  const [cardName, setCardName] = useState(user?.name || '');
  const [cardNumber, setCardNumber] = useState('4242 •••• •••• 4242');
  const [expiry, setExpiry] = useState('12/28');
  const [cvv, setCvv] = useState('123');

  useEffect(() => {
    if (!eventId || !holdId) {
      navigate('/events');
      return;
    }

    Promise.all([
      apiFetch(`/events/${eventId}`),
      apiFetch(`/events/${eventId}/seats`),
    ])
      .then(([eventData, seatData]) => {
        setEvent(eventData);
        const mySeats = seatData.filter((s: any) => s.holdId === holdId);
        setSeats(mySeats);
        if (mySeats.length > 0) {
          setHold({
            holdId,
            expiresAt: mySeats[0].expiresAt,
          });
        }
      })
      .catch((err) => setErrorMsg(err.message))
      .finally(() => setLoading(false));
  }, [eventId, holdId]);

  const handleCompletePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg('');

    try {
      const booking = await apiFetch('/bookings', {
        method: 'POST',
        body: JSON.stringify({
          eventId,
          holdId,
          paymentDetails: {
            cardHolderName: cardName,
            cardNumber,
          },
        }),
      });

      navigate(`/booking/confirmation/${booking.id}`);
    } catch (err: any) {
      setErrorMsg(err.message || 'Payment processing failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleHoldExpired = () => {
    setErrorMsg('Your seat hold timer expired during checkout.');
    setTimeout(() => {
      navigate(`/events/${eventId}/select-seats`);
    }, 2500);
  };

  if (loading) return <div className="py-20 text-center text-slate-400">Preparing checkout...</div>;
  if (!event) return <div className="py-20 text-center text-slate-400">Event details missing</div>;

  const totalPrice = seats.reduce((sum, s) => sum + s.price, 0);

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-16">
      <div>
        <h1 className="text-3xl font-bold text-slate-100">Checkout & Payment</h1>
        <p className="text-sm text-slate-400 mt-1">Review your tickets and complete secure payment</p>
      </div>

      {errorMsg && (
        <div className="bg-rose-950/40 border border-rose-500/50 text-rose-300 p-4 rounded-xl text-sm font-semibold flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {hold && (
        <HoldCountdownBanner expiresAt={hold.expiresAt} onExpire={handleHoldExpired} />
      )}

      <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
        {/* Order Summary Column */}
        <div className="md:col-span-2 bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-6 h-fit">
          <h2 className="text-lg font-bold text-slate-100 pb-3 border-b border-slate-800">
            Booking Summary
          </h2>

          <div className="space-y-2">
            <h3 className="font-bold text-slate-200 text-base">{event.title}</h3>
            <p className="text-xs text-slate-400">{event.venue.name}</p>
            <p className="text-xs text-indigo-400 font-semibold">
              {new Date(event.date).toLocaleDateString()} at {event.startTime}
            </p>
          </div>

          <div className="space-y-2 pt-4 border-t border-slate-800">
            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block">
              Held Seats ({seats.length})
            </span>
            <div className="flex flex-wrap gap-2">
              {seats.map((seat) => (
                <span
                  key={seat.id}
                  className="px-2.5 py-1 rounded bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 font-semibold text-xs"
                >
                  {seat.rowLabel}{seat.seatNumber} ({seat.category})
                </span>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
            <span className="text-sm text-slate-300 font-semibold">Total Amount</span>
            <span className="text-2xl font-extrabold text-indigo-400">₹{totalPrice.toFixed(2)}</span>
          </div>
        </div>

        {/* Mock Payment Form Column */}
        <div className="md:col-span-3 bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-indigo-400" />
              Mock Payment Gateway
            </h2>
            <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
              <ShieldCheck className="w-4 h-4" /> 256-bit Encrypted
            </span>
          </div>

          <form onSubmit={handleCompletePayment} className="space-y-4">
            <div>
              <label className="text-xs text-slate-400 font-semibold block mb-1.5">Cardholder Name</label>
              <input
                type="text"
                required
                value={cardName}
                onChange={(e) => setCardName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="text-xs text-slate-400 font-semibold block mb-1.5">Card Number</label>
              <input
                type="text"
                required
                value={cardNumber}
                onChange={(e) => setCardNumber(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-slate-400 font-semibold block mb-1.5">Expiry Date</label>
                <input
                  type="text"
                  required
                  value={expiry}
                  onChange={(e) => setExpiry(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 font-semibold block mb-1.5">CVV</label>
                <input
                  type="password"
                  required
                  value={cvv}
                  onChange={(e) => setCvv(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="pt-4">
              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 transition text-sm"
              >
                <CheckCircle2 className="w-5 h-5" />
                <span>{submitting ? 'Processing Payment...' : `Pay ₹${totalPrice.toFixed(2)} & Confirm Booking`}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
