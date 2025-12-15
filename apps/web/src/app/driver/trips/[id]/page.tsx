'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { driverTrips, Trip, TripStatus, Attachment } from '@/lib/api';

const statusLabels: Record<TripStatus, string> = {
  DRAFT: 'Nháp',
  PENDING: 'Chờ duyệt',
  APPROVED: 'Đã duyệt',
  REJECTED: 'Từ chối',
  EXCEPTION: 'Ngoại lệ',
};

const statusColors: Record<TripStatus, string> = {
  DRAFT: 'bg-slate-100 text-slate-700',
  PENDING: 'bg-amber-100 text-amber-700',
  APPROVED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700',
  EXCEPTION: 'bg-amber-100 text-amber-700',
};

export default function TripDetailPage() {
  const params = useParams();
  const router = useRouter();
  const tripId = params.id as string;

  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadTrip();
  }, [tripId]);

  const loadTrip = async () => {
    try {
      setLoading(true);
      const data = await driverTrips.getById(tripId);
      setTrip(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi tải dữ liệu');
    } finally {
      setLoading(false);
    }
  };

  const formatDateTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatWeight = (weight?: number) => {
    if (!weight) return '-';
    return `${weight.toFixed(2)} tấn`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="spinner border-primary-500 border-t-transparent"></div>
      </div>
    );
  }

  if (error || !trip) {
    return (
      <div className="p-4">
        <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm mb-4">
          {error || 'Không tìm thấy chuyến'}
        </div>
        <Link href="/driver/trips" className="btn-secondary w-full block text-center">
          Quay lại
        </Link>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={() => router.back()}
          className="p-2 -ml-2 text-slate-600 hover:text-slate-900"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex-1">
          <h2 className="font-semibold text-slate-900">{trip.tripCode}</h2>
          <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${statusColors[trip.status]}`}>
            {statusLabels[trip.status]}
          </span>
        </div>
      </div>

      {/* Route Info */}
      <div className="card">
        <h3 className="text-sm font-medium text-slate-500 mb-2">Tuyến</h3>
        <p className="font-semibold text-slate-900 text-lg">{trip.route.name}</p>
        <div className="flex items-center gap-2 mt-2 text-sm text-slate-600">
          <span>{trip.origin.name}</span>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
          </svg>
          <span>{trip.destination.name}</span>
        </div>
      </div>

      {/* Vehicle & Time */}
      <div className="grid grid-cols-2 gap-3">
        <div className="card">
          <h3 className="text-sm font-medium text-slate-500 mb-1">Xe</h3>
          <p className="font-semibold text-slate-900">{trip.vehicle.plateNo}</p>
          <p className="text-xs text-slate-500">{trip.vehicle.vehicleType}</p>
        </div>
        <div className="card">
          <h3 className="text-sm font-medium text-slate-500 mb-1">Ngày</h3>
          <p className="font-semibold text-slate-900">
            {new Date(trip.tripDate).toLocaleDateString('vi-VN')}
          </p>
          {trip.departureTime && (
            <p className="text-xs text-slate-500">
              {new Date(trip.departureTime).toLocaleTimeString('vi-VN', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          )}
        </div>
      </div>

      {/* Weight Info */}
      <div className="card">
        <h3 className="text-sm font-medium text-slate-500 mb-2">Khối lượng</h3>
        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <p className="text-xs text-slate-500">Boc</p>
            <p className="font-semibold text-slate-900">{formatWeight(trip.weightLoaded)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Do</p>
            <p className="font-semibold text-slate-900">{formatWeight(trip.weightUnloaded)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Chênh lệch</p>
            <p className={`font-semibold ${
              trip.weightLoaded && trip.weightUnloaded
                ? Math.abs(trip.weightLoaded - trip.weightUnloaded) > 0.5
                  ? 'text-amber-600'
                  : 'text-green-600'
                : 'text-slate-400'
            }`}>
              {trip.weightLoaded && trip.weightUnloaded
                ? `${(trip.weightLoaded - trip.weightUnloaded).toFixed(2)} tấn`
                : '-'}
            </p>
          </div>
        </div>
      </div>

      {/* Note */}
      {trip.note && (
        <div className="card">
          <h3 className="text-sm font-medium text-slate-500 mb-1">Ghi chú</h3>
          <p className="text-slate-700">{trip.note}</p>
        </div>
      )}

      {/* Rejection reason */}
      {trip.status === 'REJECTED' && trip.rejectionReason && (
        <div className="card bg-red-50 border-red-200">
          <h3 className="text-sm font-medium text-red-700 mb-1">Lý do từ chối</h3>
          <p className="text-red-600">{trip.rejectionReason}</p>
        </div>
      )}

      {/* Attachments */}
      {((trip.records && trip.records.length > 0) || (trip.attachments && trip.attachments.length > 0)) && (
        <div className="card">
          {(() => {
            const attachments = trip.records || trip.attachments || [];
            return (
              <>
                <h3 className="text-sm font-medium text-slate-500 mb-2">
                  Ảnh đính kèm ({attachments.length})
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  {attachments.map((att: Attachment) => (
                    <div key={att.id} className="relative aspect-video rounded-lg overflow-hidden bg-slate-100">
                      <img
                        src={att.fileUrl || att.url || ''}
                        alt={att.recordType}
                        className="w-full h-full object-cover"
                      />
                      <span className="absolute bottom-1 left-1 bg-black/60 text-white text-xs px-1.5 py-0.5 rounded">
                        {att.recordType === 'WEIGHT_TICKET_LOAD' ? 'Phiếu bốc' : 'Phiếu đổ'}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            );
          })()}
        </div>
      )}

      {/* Timestamps */}
      <div className="text-xs text-slate-400 space-y-1">
        <p>Tạo lúc: {formatDateTime(trip.createdAt)}</p>
        {trip.submittedAt && <p>Gửi duyệt: {formatDateTime(trip.submittedAt)}</p>}
        {trip.approvedAt && <p>Duyệt: {formatDateTime(trip.approvedAt)}</p>}
      </div>
    </div>
  );
}
