'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { driverTrips, referenceData, Vehicle, Route, Station } from '@/lib/api';

export default function NewTripPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reference data
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [stations, setStations] = useState<Station[]>([]);
  const [loadingRef, setLoadingRef] = useState(true);

  // Form state
  const [vehicleId, setVehicleId] = useState('');
  const [routeId, setRouteId] = useState('');
  const [originId, setOriginId] = useState('');
  const [destinationId, setDestinationId] = useState('');
  const [weightLoaded, setWeightLoaded] = useState('');
  const [note, setNote] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  // UI state
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    loadReferenceData();
  }, []);

  // Auto-fill origin/destination when route changes
  useEffect(() => {
    if (routeId) {
      const route = routes.find((r) => r.id === routeId);
      if (route) {
        setOriginId(route.origin.id);
        setDestinationId(route.destination.id);
      }
    }
  }, [routeId, routes]);

  const loadReferenceData = async () => {
    try {
      const [vehiclesData, routesData, stationsData] = await Promise.all([
        referenceData.vehicles(),
        referenceData.routes(),
        referenceData.stations(),
      ]);
      setVehicles(vehiclesData);
      setRoutes(routesData);
      setStations(stationsData);
    } catch (err) {
      setError('Lỗi tải dữ liệu tham chiếu');
    } finally {
      setLoadingRef(false);
    }
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onload = () => setPhotoPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const removePhoto = () => {
    setPhotoFile(null);
    setPhotoPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      // Create trip
      const trip = await driverTrips.create({
        vehicleId,
        routeId,
        originId,
        destinationId,
        tripDate: new Date().toISOString().split('T')[0],
        departureTime: new Date().toISOString(),
        weightLoaded: weightLoaded ? parseFloat(weightLoaded) : undefined,
        note: note || undefined,
      });

      // Upload photo if exists
      if (photoFile) {
        const attachmentData: Record<string, string> = {
          recordType: 'WEIGHT_TICKET_LOAD',
        };
        if (weightLoaded) {
          attachmentData.weight = weightLoaded;
        }
        await driverTrips.uploadAttachment(trip.id, photoFile, attachmentData);
      }

      // Submit for review
      await driverTrips.submit(trip.id);

      setSuccess(true);

      // Redirect after 2s
      setTimeout(() => {
        router.push('/driver/trips');
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi tạo chuyến');
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingRef) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="spinner border-primary-500 border-t-transparent"></div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="p-4 text-center py-12">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-slate-900 mb-2">Tạo chuyến thành công!</h2>
        <p className="text-slate-600">Chuyến đang chờ duyệt</p>
      </div>
    );
  }

  return (
    <div className="p-4">
      <h2 className="font-semibold text-slate-900 mb-4">Tạo chuyến mới</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* Vehicle */}
        <div>
          <label className="input-label">Xe *</label>
          <select
            className="input-field"
            value={vehicleId}
            onChange={(e) => setVehicleId(e.target.value)}
            required
          >
            <option value="">Chọn xe...</option>
            {vehicles.map((v) => (
              <option key={v.id} value={v.id}>
                {v.plateNo} - {v.vehicleType}
              </option>
            ))}
          </select>
        </div>

        {/* Route */}
        <div>
          <label className="input-label">Tuyến *</label>
          <select
            className="input-field"
            value={routeId}
            onChange={(e) => setRouteId(e.target.value)}
            required
          >
            <option value="">Chọn tuyến...</option>
            {routes.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </div>

        {/* Origin & Destination (auto-filled but can override) */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="input-label">Điểm bốc</label>
            <select
              className="input-field text-sm"
              value={originId}
              onChange={(e) => setOriginId(e.target.value)}
              required
            >
              <option value="">Chọn...</option>
              {stations.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="input-label">Điểm đổ</label>
            <select
              className="input-field text-sm"
              value={destinationId}
              onChange={(e) => setDestinationId(e.target.value)}
              required
            >
              <option value="">Chọn...</option>
              {stations.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Weight */}
        <div>
          <label className="input-label">Khối lượng bốc (tấn)</label>
          <input
            type="number"
            className="input-field"
            value={weightLoaded}
            onChange={(e) => setWeightLoaded(e.target.value)}
            placeholder="VD: 14.5"
            step="0.01"
            min="0"
            inputMode="decimal"
          />
        </div>

        {/* Photo */}
        <div>
          <label className="input-label">Ảnh phiếu cân (tùy chọn)</label>
          {photoPreview ? (
            <div className="relative">
              <img
                src={photoPreview}
                alt="Preview"
                className="w-full h-48 object-cover rounded-lg"
              />
              <button
                type="button"
                onClick={removePhoto}
                className="absolute top-2 right-2 bg-red-500 text-white p-1.5 rounded-full"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ) : (
            <label className="block border-2 border-dashed border-slate-300 rounded-lg p-6 text-center cursor-pointer hover:border-primary-400 transition-colors">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handlePhotoChange}
                className="hidden"
              />
              <svg className="w-8 h-8 mx-auto text-slate-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <p className="text-sm text-slate-600">Chạm để chụp ảnh</p>
            </label>
          )}
        </div>

        {/* Note */}
        <div>
          <label className="input-label">Ghi chú</label>
          <textarea
            className="input-field resize-none"
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Ghi chú thêm..."
          />
        </div>

        {/* Submit */}
        <button
          type="submit"
          className="btn-primary w-full flex items-center justify-center gap-2"
          disabled={submitting || !vehicleId || !routeId}
        >
          {submitting && <span className="spinner"></span>}
          {submitting ? 'Đang xử lý...' : 'Tạo chuyến & Gửi duyệt'}
        </button>
      </form>
    </div>
  );
}
