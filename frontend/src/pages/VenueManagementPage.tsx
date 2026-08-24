import React, { useEffect, useState } from 'react';
import { apiFetch } from '../api/client';
import { SeatLayoutBuilder, SeatConfig } from '../components/SeatLayoutBuilder';
import { Building2, Plus, Trash2, Edit2, CheckCircle2, AlertCircle } from 'lucide-react';

export const VenueManagementPage: React.FC = () => {
  const [venues, setVenues] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [totalRows, setTotalRows] = useState(5);
  const [seatsPerRow, setSeatsPerRow] = useState(8);
  const [customSeats, setCustomSeats] = useState<SeatConfig[]>([]);

  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState('');

  const fetchVenues = () => {
    apiFetch('/venues')
      .then(setVenues)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchVenues();
  }, []);

  const handleLayoutChange = (r: number, s: number, updatedSeats: SeatConfig[]) => {
    setTotalRows(r);
    setSeatsPerRow(s);
    setCustomSeats(updatedSeats);
  };

  const handleCreateVenue = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setMsg('');

    try {
      await apiFetch('/venues', {
        method: 'POST',
        body: JSON.stringify({
          name,
          address,
          city,
          totalRows,
          seatsPerRow,
          seats: customSeats,
        }),
      });

      setMsg('✅ Venue created successfully!');
      setShowCreateModal(false);
      setName('');
      setAddress('');
      setCity('');
      fetchVenues();
    } catch (err: any) {
      setMsg(`❌ ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteVenue = async (venueId: string) => {
    if (!window.confirm('Delete this venue?')) return;
    try {
      await apiFetch(`/venues/${venueId}`, { method: 'DELETE' });
      fetchVenues();
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (loading) return <div className="py-20 text-center text-slate-400">Loading venues...</div>;

  return (
    <div className="space-y-8 pb-16">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-100 flex items-center gap-2">
            <Building2 className="w-8 h-8 text-indigo-400" />
            Venue & Seat Layout Builder
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Define reusable venue layouts, custom seat categories, and seat numbers
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(!showCreateModal)}
          className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-5 py-2.5 rounded-xl text-sm shadow-lg shadow-indigo-600/30 flex items-center gap-2 transition w-fit"
        >
          <Plus className="w-4 h-4" /> {showCreateModal ? 'Cancel' : 'Build New Venue'}
        </button>
      </div>

      {msg && (
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl text-sm font-semibold text-slate-200">
          {msg}
        </div>
      )}

      {/* Venue Builder Form Modal / Section */}
      {showCreateModal && (
        <form onSubmit={handleCreateVenue} className="bg-slate-900 border border-slate-800 p-6 sm:p-8 rounded-3xl space-y-6 shadow-2xl">
          <h2 className="text-xl font-bold text-slate-100 pb-3 border-b border-slate-800">
            Create Venue & Custom Seat Categories
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-400 block mb-1.5">Venue Name</label>
              <input
                type="text"
                required
                placeholder="Grand Cinema Screen 1"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-400 block mb-1.5">Address</label>
              <input
                type="text"
                required
                placeholder="100 Tech Blvd"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-400 block mb-1.5">City</label>
              <input
                type="text"
                required
                placeholder="San Francisco"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Interactive Layout Builder */}
          <SeatLayoutBuilder
            initialRows={totalRows}
            initialSeatsPerRow={seatsPerRow}
            onChange={handleLayoutChange}
          />

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 transition text-sm"
          >
            <CheckCircle2 className="w-5 h-5" />
            <span>{submitting ? 'Saving Venue...' : 'Save Venue & Layout'}</span>
          </button>
        </form>
      )}

      {/* Venues Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-5 border-b border-slate-800 font-bold text-slate-100">
          Existing Venues ({venues.length})
        </div>

        <div className="divide-y divide-slate-800/80">
          {venues.map((v) => (
            <div key={v.id} className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <h3 className="font-bold text-slate-100 text-base">{v.name}</h3>
                <p className="text-xs text-slate-400">{v.address}, {v.city}</p>
                <p className="text-xs text-indigo-400 font-semibold pt-1">
                  Layout: {v.totalRows} Rows × {v.seatsPerRow} Seats/Row ({v._count?.seats || (v.totalRows * v.seatsPerRow)} Total Seats)
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleDeleteVenue(v.id)}
                  className="text-rose-400 hover:text-rose-300 text-xs font-semibold px-3 py-1.5 rounded-lg border border-rose-500/30 bg-rose-950/20 flex items-center gap-1 transition"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
