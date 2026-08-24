import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { apiFetch } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { HoldCountdownBanner } from '../components/HoldCountdownBanner';
import { Gift, CheckCircle2, AlertTriangle, ArrowRight } from 'lucide-react';

export const WaitlistOfferPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const { user } = useAuth();
  const navigate = useNavigate();

  const [offer, setOffer] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!token) {
      setErrorMsg('Invalid waitlist offer token');
      setLoading(false);
      return;
    }

    apiFetch(`/waitlist/offers/${token}`)
      .then(setOffer)
      .catch((err) => setErrorMsg(err.message))
      .finally(() => setLoading(false));
  }, [token]);

  const handleAcceptOffer = async () => {
    if (!user) {
      navigate(`/login?redirect=/waitlist/offer?token=${token}`);
      return;
    }

    setSubmitting(true);
    setErrorMsg('');

    try {
      const res = await apiFetch(`/waitlist/offers/${token}/accept`, {
        method: 'POST',
      });
      // Redirect to checkout with generated holdId
      navigate(`/checkout?eventId=${res.eventId}&holdId=${res.holdId}`);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to accept waitlist offer');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="py-20 text-center text-slate-400">Verifying waitlist offer token...</div>;

  return (
    <div className="max-w-xl mx-auto space-y-6 pb-16">
      <div className="text-center space-y-2">
        <div className="w-14 h-14 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-2xl flex items-center justify-center mx-auto shadow-xl">
          <Gift className="w-8 h-8" />
        </div>
        <h1 className="text-3xl font-extrabold text-slate-100">Waitlist Seat Offered!</h1>
        <p className="text-sm text-slate-400">A seat opened up for you from the priority waitlist queue.</p>
      </div>

      {errorMsg ? (
        <div className="bg-rose-950/40 border border-rose-500/50 text-rose-300 p-6 rounded-2xl space-y-4 text-center">
          <AlertTriangle className="w-8 h-8 text-rose-400 mx-auto" />
          <p className="font-semibold text-sm">{errorMsg}</p>
        </div>
      ) : offer ? (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-6 shadow-2xl">
          <HoldCountdownBanner
            expiresAt={offer.expiresAt}
            onExpire={() => setErrorMsg('This waitlist offer has expired.')}
          />

          <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-3 text-sm">
            <h3 className="font-bold text-slate-200 text-base">{offer.waitlistEntry.event.title}</h3>
            <p className="text-xs text-slate-400">{offer.waitlistEntry.event.venue.name}</p>
            <div className="flex items-center justify-between pt-2 border-t border-slate-800">
              <span className="text-xs text-slate-400">Allocated Seat:</span>
              <span className="font-bold text-indigo-400">
                {offer.eventSeat.rowLabel}{offer.eventSeat.seatNumber} ({offer.eventSeat.category})
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">Price:</span>
              <span className="font-bold text-emerald-400">₹{offer.eventSeat.price.toFixed(2)}</span>
            </div>
          </div>

          <button
            onClick={handleAcceptOffer}
            disabled={submitting}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 transition text-sm"
          >
            <CheckCircle2 className="w-5 h-5" />
            <span>{submitting ? 'Claiming Seat...' : 'Accept Offer & Proceed to Checkout'}</span>
          </button>
        </div>
      ) : null}
    </div>
  );
};
