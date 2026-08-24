import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiFetch } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { SeatMap, SeatItem } from '../components/SeatMap';
import { HoldCountdownBanner } from '../components/HoldCountdownBanner';
import { Lock, ArrowRight, AlertCircle } from 'lucide-react';

export const SeatSelectionPage: React.FC = () => {
  const { id } = useParams<{ id: string }>(); // eventId
  const { user } = useAuth();
  const navigate = useNavigate();

  const [event, setEvent] = useState<any>(null);
  const [seats, setSeats] = useState<SeatItem[]>([]);
  const [selectedSeatIds, setSelectedSeatIds] = useState<string[]>([]);
  const [activeHold, setActiveHold] = useState<any>(null);

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [holding, setHolding] = useState(false);

  const fetchSeats = async () => {
    if (!id) return;
    try {
      const seatData = await apiFetch(`/events/${id}/seats`);
      setSeats(seatData);

      // Check if user currently has an active hold
      const myHeldSeats = seatData.filter((s: SeatItem) => s.isHeldByMe);
      if (myHeldSeats.length > 0) {
        const holdId = myHeldSeats[0].holdId;
        const expiresAt = myHeldSeats[0].expiresAt;
        setActiveHold({ holdId, expiresAt });
        setSelectedSeatIds(myHeldSeats.map((s: SeatItem) => s.id));
      }
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    apiFetch(`/events/${id}`).then(setEvent).catch(console.error);
    fetchSeats();
  }, [id]);

  const handleToggleSeatSelect = (seat: SeatItem) => {
    if (!user) {
      navigate('/login');
      return;
    }

    if (activeHold) {
      // If hold is already active, user can release or proceed
      return;
    }

    setSelectedSeatIds((prev) =>
      prev.includes(seat.id) ? prev.filter((sId) => sId !== seat.id) : [...prev, seat.id]
    );
  };

  const handleHoldSeats = async () => {
    if (!user) {
      navigate('/login');
      return;
    }
    if (selectedSeatIds.length === 0) return;

    setHolding(true);
    setErrorMsg('');

    try {
      const result = await apiFetch(`/events/${id}/holds`, {
        method: 'POST',
        body: JSON.stringify({
          eventSeatIds: selectedSeatIds,
          ttlMinutes: 10,
        }),
      });

      setActiveHold({
        holdId: result.holdId,
        expiresAt: result.expiresAt,
      });

      await fetchSeats();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to place seat hold');
    } finally {
      setHolding(false);
    }
  };

  const handleHoldExpired = () => {
    setActiveHold(null);
    setSelectedSeatIds([]);
    setErrorMsg('Your hold expired. The seats have been released back to inventory.');
    fetchSeats();
  };

  const handleProceedToCheckout = () => {
    if (activeHold && id) {
      navigate(`/checkout?eventId=${id}&holdId=${activeHold.holdId}`);
    }
  };

  if (loading) return <div className="py-20 text-center text-slate-400">Loading seat map...</div>;
  if (!event) return <div className="py-20 text-center text-slate-400">Event not found</div>;

  const selectedSeats = seats.filter((s) => selectedSeatIds.includes(s.id));
  const totalPrice = selectedSeats.reduce((sum, s) => sum + s.price, 0);

  return (
    <div className="space-y-6 pb-16">
      {/* Event Top Info */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-2xl">
        <div>
          <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">{event.eventType}</span>
          <h1 className="text-2xl font-bold text-slate-100">{event.title}</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            {event.venue.name} — {new Date(event.date).toLocaleDateString()} at {event.startTime}
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-4">
          <div className="text-right">
            <span className="text-xs text-slate-400 block">Selected ({selectedSeats.length})</span>
            <span className="text-xl font-extrabold text-indigo-400">₹{totalPrice.toFixed(2)}</span>
          </div>

          {!activeHold ? (
            <button
              onClick={handleHoldSeats}
              disabled={selectedSeatIds.length === 0 || holding}
              className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold px-6 py-3 rounded-xl text-sm shadow-lg shadow-indigo-600/30 flex items-center gap-2 transition"
            >
              <Lock className="w-4 h-4" />
              <span>{holding ? 'Holding Seats...' : 'Hold Selected Seats'}</span>
            </button>
          ) : (
            <button
              onClick={handleProceedToCheckout}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-6 py-3 rounded-xl text-sm shadow-lg shadow-emerald-600/30 flex items-center gap-2 transition"
            >
              <span>Proceed to Checkout</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Error Alert */}
      {errorMsg && (
        <div className="bg-rose-950/40 border border-rose-500/50 text-rose-300 p-4 rounded-xl text-sm font-semibold flex items-center gap-2 shadow-lg">
          <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Active Hold Countdown Banner */}
      {activeHold && (
        <HoldCountdownBanner
          expiresAt={activeHold.expiresAt}
          onExpire={handleHoldExpired}
        />
      )}

      {/* Visual Interactive Seat Map */}
      <SeatMap
        eventId={event.id}
        seats={seats}
        selectedSeatIds={selectedSeatIds}
        onToggleSeatSelect={handleToggleSeatSelect}
        categoryPrices={event.categoryPrices}
      />
    </div>
  );
};
