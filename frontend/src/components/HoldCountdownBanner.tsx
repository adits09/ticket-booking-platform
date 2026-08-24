import React, { useEffect, useState } from 'react';
import { Timer, AlertTriangle } from 'lucide-react';

interface HoldCountdownBannerProps {
  expiresAt: string | Date;
  onExpire: () => void;
}

export const HoldCountdownBanner: React.FC<HoldCountdownBannerProps> = ({ expiresAt, onExpire }) => {
  const [timeLeftMs, setTimeLeftMs] = useState<number>(0);

  useEffect(() => {
    const targetTime = new Date(expiresAt).getTime();

    const updateTimer = () => {
      const diff = targetTime - Date.now();
      if (diff <= 0) {
        setTimeLeftMs(0);
        onExpire();
      } else {
        setTimeLeftMs(diff);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [expiresAt, onExpire]);

  const totalSeconds = Math.floor(timeLeftMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  const isUrgent = minutes < 2;

  if (timeLeftMs <= 0) {
    return (
      <div className="w-full bg-rose-500/20 border border-rose-500/40 text-rose-300 p-4 rounded-xl flex items-center justify-between shadow-lg my-4">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-rose-400" />
          <span className="font-semibold text-sm">Your seat hold has expired! The seats have been released.</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`w-full p-4 rounded-xl flex items-center justify-between shadow-lg my-4 border transition-all ${
        isUrgent
          ? 'bg-amber-950/40 border-amber-500/60 text-amber-300 animate-pulse'
          : 'bg-indigo-950/40 border-indigo-500/40 text-indigo-200'
      }`}
    >
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${isUrgent ? 'bg-amber-500/20 text-amber-400' : 'bg-indigo-500/20 text-indigo-400'}`}>
          <Timer className="w-5 h-5" />
        </div>
        <div>
          <h4 className="font-bold text-sm">Seats Reserved Temporarily</h4>
          <p className="text-xs opacity-80">Complete your booking before timer runs out to lock your seats.</p>
        </div>
      </div>

      <div className="flex items-center gap-2 bg-slate-950/60 px-4 py-2 rounded-lg border border-slate-800">
        <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Expires In:</span>
        <span className={`font-mono text-lg font-bold ${isUrgent ? 'text-amber-400' : 'text-indigo-400'}`}>
          {formattedTime}
        </span>
      </div>
    </div>
  );
};
