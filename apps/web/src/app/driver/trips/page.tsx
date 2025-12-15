'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { driverTrips, Trip, TripStatus } from '@/lib/api';

const statusLabels: Record<TripStatus, string> = {
  DRAFT: 'Nháp',
  PENDING: 'Chờ duyệt',
  APPROVED: 'Đã duyệt',
  REJECTED: 'Từ chối',
  EXCEPTION: 'Ngoại lệ',
};

const statusColors: Record<TripStatus, string> = {
  DRAFT: 'badge-draft',
  PENDING: 'badge-pending',
  APPROVED: 'badge-approved',
  REJECTED: 'badge-rejected',
  EXCEPTION: 'badge-pending',
};

export default function DriverTripsPage() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadTrips();
  }, []);

  const loadTrips = async () => {
    try {
      setLoading(true);
      const result = await driverTrips.list({ limit: 50 });
      setTrips(result.trips);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi tải dữ liệu');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
    });
  };

  const formatWeight = (weight?: number) => {
    if (!weight) return '-';
    return `${weight.toFixed(1)}T`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="spinner border-primary-500 border-t-transparent"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
        <button onClick={loadTrips} className="btn-secondary w-full mt-4">
          Thử lại
        </button>
      </div>
    );
  }

  if (trips.length === 0) {
    return (
      <div className="p-4 text-center py-12">
        <svg className="w-12 h-12 mx-auto text-slate-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
        <p className="text-slate-500 mb-4">Chưa có chuyến nào</p>
        <Link href="/driver/trips/new" className="btn-primary inline-block">
          Tạo chuyến mới
        </Link>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center justify-between mb-2">
        <h2 className="font-semibold text-slate-900">Chuyến của tôi</h2>
        <span className="text-sm text-slate-500">{trips.length} chuyến</span>
      </div>

      {trips.map((trip) => (
        <Link
          key={trip.id}
          href={`/driver/trips/${trip.id}`}
          className="card block hover:border-primary-300 transition-colors"
        >
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium text-slate-900 truncate">
                  {trip.route.name}
                </span>
                <span className={`badge ${statusColors[trip.status]}`}>
                  {statusLabels[trip.status]}
                </span>
              </div>
              <p className="text-sm text-slate-600 truncate">
                {trip.vehicle.plateNo} &middot; {formatDate(trip.tripDate)}
              </p>
            </div>
            <div className="text-right ml-3">
              <p className="font-semibold text-slate-900">
                {formatWeight(trip.weightLoaded)}
              </p>
              <p className="text-xs text-slate-500">{trip.tripCode}</p>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
