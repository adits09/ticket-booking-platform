import React, { useState } from 'react';
import { Plus, Trash2, Shield, Star, CheckCircle, LayoutGrid } from 'lucide-react';

export interface SeatConfig {
  rowLabel: string;
  seatNumber: number;
  category: 'VIP' | 'PREMIUM' | 'STANDARD';
  isDisabled: boolean;
}

interface SeatLayoutBuilderProps {
  initialRows?: number;
  initialSeatsPerRow?: number;
  initialSeats?: SeatConfig[];
  onChange: (totalRows: number, seatsPerRow: number, seats: SeatConfig[]) => void;
}

export const SeatLayoutBuilder: React.FC<SeatLayoutBuilderProps> = ({
  initialRows = 5,
  initialSeatsPerRow = 8,
  initialSeats,
  onChange,
}) => {
  const [totalRows, setTotalRows] = useState(initialRows);
  const [seatsPerRow, setSeatsPerRow] = useState(initialSeatsPerRow);
  const [activeCategory, setActiveCategory] = useState<'VIP' | 'PREMIUM' | 'STANDARD'>('STANDARD');

  // Initialize or maintain grid seats
  const [gridSeats, setGridSeats] = useState<SeatConfig[]>(() => {
    if (initialSeats && initialSeats.length > 0) return initialSeats;

    const seats: SeatConfig[] = [];
    for (let r = 0; r < initialRows; r++) {
      const rowLabel = String.fromCharCode(65 + r);
      for (let s = 1; s <= initialSeatsPerRow; s++) {
        let category: 'VIP' | 'PREMIUM' | 'STANDARD' = 'STANDARD';
        if (r === 0) category = 'VIP';
        else if (r <= 1) category = 'PREMIUM';

        seats.push({
          rowLabel,
          seatNumber: s,
          category,
          isDisabled: false,
        });
      }
    }
    return seats;
  });

  const handleApplyDimensions = (newRows: number, newSeatsPerRow: number) => {
    setTotalRows(newRows);
    setSeatsPerRow(newSeatsPerRow);

    const updatedSeats: SeatConfig[] = [];
    for (let r = 0; r < newRows; r++) {
      const rowLabel = String.fromCharCode(65 + r);
      for (let s = 1; s <= newSeatsPerRow; s++) {
        const existing = gridSeats.find((x) => x.rowLabel === rowLabel && x.seatNumber === s);
        if (existing) {
          updatedSeats.push(existing);
        } else {
          let category: 'VIP' | 'PREMIUM' | 'STANDARD' = 'STANDARD';
          if (r === 0) category = 'VIP';
          else if (r <= 1) category = 'PREMIUM';

          updatedSeats.push({
            rowLabel,
            seatNumber: s,
            category,
            isDisabled: false,
          });
        }
      }
    }
    setGridSeats(updatedSeats);
    onChange(newRows, newSeatsPerRow, updatedSeats);
  };

  const handleSeatClick = (rowLabel: string, seatNumber: number) => {
    const updated = gridSeats.map((seat) => {
      if (seat.rowLabel === rowLabel && seat.seatNumber === seatNumber) {
        // Toggle category to activeCategory
        if (seat.category === activeCategory) {
          return { ...seat, isDisabled: !seat.isDisabled };
        }
        return { ...seat, category: activeCategory, isDisabled: false };
      }
      return seat;
    });

    setGridSeats(updated);
    onChange(totalRows, seatsPerRow, updated);
  };

  // Group by rows
  const rowsMap = gridSeats.reduce((acc, seat) => {
    if (!acc[seat.rowLabel]) acc[seat.rowLabel] = [];
    acc[seat.rowLabel].push(seat);
    return acc;
  }, {} as Record<string, SeatConfig[]>);

  const rows = Object.keys(rowsMap).sort();

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <LayoutGrid className="w-5 h-5 text-indigo-400" />
            Visual Seat Layout Builder
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Click seats to assign category or toggle disable status.
          </p>
        </div>

        {/* Dimension Controls */}
        <div className="flex items-center gap-3">
          <div>
            <label className="text-xs text-slate-400 font-semibold block mb-1">Rows</label>
            <input
              type="number"
              min={1}
              max={15}
              value={totalRows}
              onChange={(e) => handleApplyDimensions(parseInt(e.target.value) || 1, seatsPerRow)}
              className="w-20 bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-sm font-semibold text-slate-200"
            />
          </div>
          <div>
            <label className="text-xs text-slate-400 font-semibold block mb-1">Seats/Row</label>
            <input
              type="number"
              min={1}
              max={20}
              value={seatsPerRow}
              onChange={(e) => handleApplyDimensions(totalRows, parseInt(e.target.value) || 1)}
              className="w-20 bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-sm font-semibold text-slate-200"
            />
          </div>
        </div>
      </div>

      {/* Category Selector Tools */}
      <div className="flex items-center gap-3 my-6 bg-slate-950/60 p-3 rounded-xl border border-slate-800">
        <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Painting Tool:</span>
        <button
          type="button"
          onClick={() => setActiveCategory('VIP')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
            activeCategory === 'VIP'
              ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/30'
              : 'bg-amber-950/40 text-amber-300 border border-amber-500/30'
          }`}
        >
          <Star className="w-3.5 h-3.5" /> VIP
        </button>
        <button
          type="button"
          onClick={() => setActiveCategory('PREMIUM')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
            activeCategory === 'PREMIUM'
              ? 'bg-sky-500 text-slate-950 shadow-lg shadow-sky-500/30'
              : 'bg-sky-950/40 text-sky-300 border border-sky-500/30'
          }`}
        >
          <Shield className="w-3.5 h-3.5" /> Premium
        </button>
        <button
          type="button"
          onClick={() => setActiveCategory('STANDARD')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
            activeCategory === 'STANDARD'
              ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/30'
              : 'bg-emerald-950/40 text-emerald-300 border border-emerald-500/30'
          }`}
        >
          <CheckCircle className="w-3.5 h-3.5" /> Standard
        </button>
      </div>

      {/* Grid Canvas */}
      <div className="flex flex-col gap-2 items-center overflow-x-auto py-4">
        {rows.map((rowLabel) => (
          <div key={rowLabel} className="flex items-center gap-2">
            <span className="w-6 text-center text-xs font-bold text-slate-400">{rowLabel}</span>
            <div className="flex items-center gap-2">
              {rowsMap[rowLabel]
                .sort((a, b) => a.seatNumber - b.seatNumber)
                .map((seat) => {
                  let bg = 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300';
                  if (seat.category === 'VIP') bg = 'bg-amber-950/40 border-amber-500/40 text-amber-300';
                  if (seat.category === 'PREMIUM') bg = 'bg-sky-950/40 border-sky-500/40 text-sky-300';
                  if (seat.isDisabled) bg = 'bg-slate-950 border-slate-800 text-slate-600 line-through';

                  return (
                    <button
                      key={`${rowLabel}-${seat.seatNumber}`}
                      type="button"
                      onClick={() => handleSeatClick(rowLabel, seat.seatNumber)}
                      className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-semibold border transition ${bg}`}
                      title={`Row ${rowLabel} Seat ${seat.seatNumber} (${seat.category}) ${seat.isDisabled ? '- Disabled' : ''}`}
                    >
                      {seat.isDisabled ? '✕' : seat.seatNumber}
                    </button>
                  );
                })}
            </div>
            <span className="w-6 text-center text-xs font-bold text-slate-400">{rowLabel}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
