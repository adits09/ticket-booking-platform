import React, { useEffect, useState } from 'react';
import { useSocket } from '../context/SocketContext';
import { Lock, Check, Armchair } from 'lucide-react';

export interface SeatItem {
  id: string;
  seatId: string;
  rowLabel: string;
  seatNumber: number;
  category: 'VIP' | 'PREMIUM' | 'STANDARD';
  price: number;
  status: 'AVAILABLE' | 'HELD' | 'BOOKED';
  holdId?: string | null;
  isHeldByMe?: boolean;
  expiresAt?: string | null;
}

interface SeatMapProps {
  eventId: string;
  seats: SeatItem[];
  selectedSeatIds: string[];
  onToggleSeatSelect: (seat: SeatItem) => void;
  categoryPrices?: Record<string, number>;
}

export const SeatMap: React.FC<SeatMapProps> = ({
  eventId,
  seats: initialSeats,
  selectedSeatIds,
  onToggleSeatSelect,
  categoryPrices,
}) => {
  const [seats, setSeats] = useState<SeatItem[]>(initialSeats);
  const { socket } = useSocket();

  useEffect(() => {
    setSeats(initialSeats);
  }, [initialSeats]);

  // Join WebSocket event room and listen for real-time updates
  useEffect(() => {
    if (!socket || !eventId) return;

    socket.emit('join_event', eventId);

    socket.on('seats_updated', (data: { eventId: string; updates: any[] }) => {
      if (data.eventId !== eventId) return;

      setSeats((prevSeats) => {
        const updateMap = new Map(data.updates.map((u) => [u.seatId, u]));
        return prevSeats.map((seat) => {
          const update = updateMap.get(seat.id);
          if (update) {
            return {
              ...seat,
              status: update.status,
              holdId: update.holdId,
            };
          }
          return seat;
        });
      });
    });

    return () => {
      socket.emit('leave_event', eventId);
      socket.off('seats_updated');
    };
  }, [socket, eventId]);

  // Group seats by row
  const rowsMap = seats.reduce((acc, seat) => {
    if (!acc[seat.rowLabel]) {
      acc[seat.rowLabel] = [];
    }
    acc[seat.rowLabel].push(seat);
    return acc;
  }, {} as Record<string, SeatItem[]>);

  const rows = Object.keys(rowsMap).sort();

  return (
    <div className="flex flex-col items-center w-full my-6 bg-slate-900/60 p-6 rounded-2xl border border-slate-800 shadow-2xl">
      {/* Screen / Stage Curved Banner */}
      <div className="w-full max-w-2xl mb-10 flex flex-col items-center">
        <div className="w-full h-3 bg-gradient-to-r from-indigo-500 via-sky-400 to-indigo-500 rounded-t-full shadow-[0_10px_25px_-5px_rgba(99,102,241,0.5)]"></div>
        <span className="text-xs uppercase tracking-widest font-bold text-slate-400 mt-2">
          Screen / Stage
        </span>
      </div>

      {/* Seat Map Grid */}
      <div className="flex flex-col gap-3 overflow-x-auto w-full max-w-4xl pb-4 items-center">
        {rows.map((rowLabel) => {
          const rowSeats = rowsMap[rowLabel].sort((a, b) => a.seatNumber - b.seatNumber);
          return (
            <div key={rowLabel} className="flex items-center gap-2 sm:gap-3">
              {/* Row Label */}
              <span className="w-6 text-center text-sm font-bold text-slate-400">
                {rowLabel}
              </span>

              {/* Row Seats */}
              <div className="flex items-center gap-2 sm:gap-3">
                {rowSeats.map((seat) => {
                  const isSelected = selectedSeatIds.includes(seat.id);
                  const isAvailable = seat.status === 'AVAILABLE';
                  const isBooked = seat.status === 'BOOKED';
                  const isHeld = seat.status === 'HELD';
                  const isHeldByMe = seat.isHeldByMe;

                  let categoryBg = 'border-emerald-500/40 bg-emerald-950/30 text-emerald-300 hover:bg-emerald-600 hover:text-white';
                  if (seat.category === 'VIP') {
                    categoryBg = 'border-amber-500/40 bg-amber-950/30 text-amber-300 hover:bg-amber-600 hover:text-white';
                  } else if (seat.category === 'PREMIUM') {
                    categoryBg = 'border-sky-500/40 bg-sky-950/30 text-sky-300 hover:bg-sky-600 hover:text-white';
                  }

                  let btnStyle = `relative w-9 h-9 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center text-xs font-semibold border transition-all duration-200 cursor-pointer ${categoryBg}`;

                  if (isSelected) {
                    btnStyle = 'w-9 h-9 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center text-xs font-bold border-2 border-indigo-400 bg-indigo-600 text-white shadow-lg shadow-indigo-600/40 scale-105';
                  } else if (isHeldByMe) {
                    btnStyle = 'w-9 h-9 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center text-xs font-bold border-2 border-amber-400 bg-amber-500 text-slate-950 animate-pulse shadow-lg shadow-amber-500/30';
                  } else if (isHeld) {
                    btnStyle = 'w-9 h-9 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center text-xs border border-amber-900/50 bg-amber-950/40 text-amber-500/60 cursor-not-allowed';
                  } else if (isBooked) {
                    btnStyle = 'w-9 h-9 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center text-xs border border-slate-800 bg-slate-950 text-slate-600 cursor-not-allowed';
                  }

                  return (
                    <button
                      key={seat.id}
                      disabled={!isAvailable && !isSelected && !isHeldByMe}
                      onClick={() => onToggleSeatSelect(seat)}
                      title={`${seat.rowLabel}${seat.seatNumber} (${seat.category}) - ₹${seat.price} | Status: ${seat.status}`}
                      className={btnStyle}
                    >
                      {isBooked ? (
                        <span className="text-[10px]">✕</span>
                      ) : isHeld && !isHeldByMe ? (
                        <Lock className="w-3.5 h-3.5" />
                      ) : isSelected ? (
                        <Check className="w-4 h-4 stroke-[3]" />
                      ) : (
                        seat.seatNumber
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Row Label Right */}
              <span className="w-6 text-center text-sm font-bold text-slate-400">
                {rowLabel}
              </span>
            </div>
          );
        })}
      </div>

      {/* Legend & Categories */}
      <div className="w-full max-w-3xl mt-8 pt-6 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-4 text-xs">
        {/* Status Indicators */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded border border-emerald-500/60 bg-emerald-950/50"></div>
            <span className="text-slate-300 font-medium">Available</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-indigo-600 text-white flex items-center justify-center font-bold">✓</div>
            <span className="text-slate-300 font-medium">Selected</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-amber-500 animate-pulse"></div>
            <span className="text-slate-300 font-medium">Held by You</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded border border-amber-900 bg-amber-950 text-amber-500 flex items-center justify-center">🔒</div>
            <span className="text-slate-300 font-medium">Held by Other</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-slate-900 border border-slate-800 text-slate-600 flex items-center justify-center">✕</div>
            <span className="text-slate-300 font-medium">Booked</span>
          </div>
        </div>

        {/* Category Price Badges */}
        {categoryPrices && (
          <div className="flex items-center gap-3">
            <span className="px-2.5 py-1 rounded bg-amber-500/10 border border-amber-500/30 text-amber-400 font-semibold">
              VIP: ₹{categoryPrices.VIP || 500}
            </span>
            <span className="px-2.5 py-1 rounded bg-sky-500/10 border border-sky-500/30 text-sky-400 font-semibold">
              PREMIUM: ₹{categoryPrices.PREMIUM || 350}
            </span>
            <span className="px-2.5 py-1 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-semibold">
              STANDARD: ₹{categoryPrices.STANDARD || 200}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
