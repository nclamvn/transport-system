'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { reviewTrips, TripDetail, TripStatus, Attachment } from '@/lib/api';

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
  EXCEPTION: 'bg-orange-100 text-orange-700',
};

const REJECTION_REASONS = [
  'Thiếu ảnh phiếu cân',
  'Sai khối lượng',
  'Sai tuyến/điểm',
  'Trùng chuyến',
  'Thông tin không hợp lệ',
];

export default function TripReviewDetailPage() {
  const params = useParams();
  const router = useRouter();
  const tripId = params.id as string;

  const [trip, setTrip] = useState<TripDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Action states
  const [processing, setProcessing] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [customReason, setCustomReason] = useState('');
  const [weightFinal, setWeightFinal] = useState('');

  useEffect(() => {
    loadTrip();
  }, [tripId]);

  const loadTrip = async () => {
    try {
      setLoading(true);
      const data = await reviewTrips.getById(tripId, true);
      setTrip(data);
      // Pre-fill weight final with loaded weight
      if (data.weightLoaded) {
        setWeightFinal(Number(data.weightLoaded).toString());
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi tải dữ liệu');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!trip) return;

    try {
      setProcessing(true);
      setError('');
      await reviewTrips.approve(
        tripId,
        weightFinal ? parseFloat(weightFinal) : undefined
      );
      // Reload trip to get updated status
      await loadTrip();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi duyệt chuyến');
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    const reason = rejectReason === 'other' ? customReason : rejectReason;
    if (!reason.trim()) {
      setError('Vui lòng nhập lý do từ chối');
      return;
    }

    try {
      setProcessing(true);
      setError('');
      await reviewTrips.reject(tripId, reason);
      setShowRejectModal(false);
      // Reload trip to get updated status
      await loadTrip();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi từ chối chuyến');
    } finally {
      setProcessing(false);
    }
  };

  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('vi-VN');
  };

  const formatWeight = (weight?: number | string) => {
    if (!weight) return '-';
    return `${Number(weight).toFixed(2)} tấn`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="spinner border-primary-500 border-t-transparent"></div>
      </div>
    );
  }

  if (error && !trip) {
    return (
      <div className="p-6">
        <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm mb-4">
          {error}
        </div>
        <Link href="/review/trips" className="btn-secondary">
          Quay lại
        </Link>
      </div>
    );
  }

  if (!trip) return null;

  const isPending = trip.status === 'PENDING';

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link
            href="/review/trips"
            className="p-2 -ml-2 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div>
            <h2 className="text-xl font-semibold text-slate-900">{trip.tripCode}</h2>
            <span className={`inline-flex px-2 py-1 rounded text-xs font-medium ${statusColors[trip.status]}`}>
              {statusLabels[trip.status]}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        {isPending && (
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowRejectModal(true)}
              className="btn-secondary text-red-600 border-red-300 hover:bg-red-50"
              disabled={processing}
            >
              Từ chối
            </button>
            <button
              onClick={handleApprove}
              className="btn-primary"
              disabled={processing}
            >
              {processing ? 'Đang xử lý...' : 'Duyệt'}
            </button>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm mb-4">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Trip Info */}
          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <h3 className="font-medium text-slate-900 mb-4">Thông tin chuyến</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-slate-500 mb-1">Tài xế</label>
                <p className="text-slate-900">{trip.driver.name}</p>
                <p className="text-xs text-slate-500">{trip.driver.employeeCode}</p>
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Xe</label>
                <p className="text-slate-900">{trip.vehicle.plateNo}</p>
                <p className="text-xs text-slate-500">{trip.vehicle.vehicleType}</p>
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Tuyến</label>
                <p className="text-slate-900">{trip.route.name}</p>
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Ngày</label>
                <p className="text-slate-900">{formatDateTime(trip.tripDate)}</p>
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Điểm bốc</label>
                <p className="text-slate-900">{trip.origin.name}</p>
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Điểm đổ</label>
                <p className="text-slate-900">{trip.destination.name}</p>
              </div>
            </div>
          </div>

          {/* Weight Info */}
          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <h3 className="font-medium text-slate-900 mb-4">Khối lượng</h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-xs text-slate-500 mb-1">Boc</label>
                <p className="text-lg font-semibold text-slate-900">{formatWeight(trip.weightLoaded)}</p>
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Do</label>
                <p className="text-lg font-semibold text-slate-900">{formatWeight(trip.weightUnloaded)}</p>
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Chot</label>
                <p className="text-lg font-semibold text-green-600">{formatWeight(trip.weightFinal)}</p>
              </div>
            </div>

            {/* Weight Final Input (only for pending) */}
            {isPending && (
              <div className="mt-4 pt-4 border-t border-slate-200">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Khối lượng chốt (tấn)
                </label>
                <input
                  type="number"
                  className="input-field w-48"
                  value={weightFinal}
                  onChange={(e) => setWeightFinal(e.target.value)}
                  placeholder="VD: 14.5"
                  step="0.01"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Để trống để sử dụng khối lượng bốc
                </p>
              </div>
            )}
          </div>

          {/* Attachments */}
          {((trip.records && trip.records.length > 0) || (trip.attachments && trip.attachments.length > 0)) && (
            <div className="bg-white rounded-lg border border-slate-200 p-6">
              {(() => {
                const attachments = trip.records || trip.attachments || [];
                return (
                  <>
                    <h3 className="font-medium text-slate-900 mb-4">
                      Ảnh đính kèm ({attachments.length})
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {attachments.map((att: Attachment) => (
                        <div key={att.id} className="relative aspect-video rounded-lg overflow-hidden bg-slate-100 border border-slate-200">
                          <img
                            src={att.fileUrl || att.url || ''}
                            alt={att.recordType}
                            className="w-full h-full object-cover"
                          />
                          <span className="absolute bottom-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded">
                            {att.recordType === 'WEIGHT_TICKET_LOAD' ? 'Phiếu bốc' :
                             att.recordType === 'WEIGHT_TICKET_UNLOAD' ? 'Phiếu đổ' : 'Ảnh'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </>
                );
              })()}
            </div>
          )}

          {/* Note */}
          {trip.note && (
            <div className="bg-white rounded-lg border border-slate-200 p-6">
              <h3 className="font-medium text-slate-900 mb-2">Ghi chú</h3>
              <p className="text-slate-700">{trip.note}</p>
            </div>
          )}

          {/* Rejection Reason */}
          {trip.status === 'REJECTED' && trip.rejectionReason && (
            <div className="bg-red-50 rounded-lg border border-red-200 p-6">
              <h3 className="font-medium text-red-800 mb-2">Lý do từ chối</h3>
              <p className="text-red-700">{trip.rejectionReason}</p>
            </div>
          )}
        </div>

        {/* Sidebar - Audit Log */}
        <div className="space-y-6">
          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <h3 className="font-medium text-slate-900 mb-4">Lịch sử</h3>
            {trip.auditLogs && trip.auditLogs.length > 0 ? (
              <div className="space-y-3">
                {trip.auditLogs.map((log) => (
                  <div key={log.id} className="border-l-2 border-slate-200 pl-3 py-1">
                    <p className="text-sm text-slate-900">
                      {log.action === 'CREATE' && 'Tạo chuyến'}
                      {log.action === 'UPDATE' && 'Cập nhật'}
                      {log.action === 'DELETE' && 'Xóa'}
                    </p>
                    <p className="text-xs text-slate-500">{log.userEmail}</p>
                    <p className="text-xs text-slate-400">{formatDateTime(log.createdAt)}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500">Chưa có lịch sử</p>
            )}
          </div>

          {/* Timestamps */}
          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <h3 className="font-medium text-slate-900 mb-4">Thời gian</h3>
            <div className="space-y-2 text-sm">
              <div>
                <span className="text-slate-500">Tạo lúc:</span>
                <span className="ml-2 text-slate-900">{formatDateTime(trip.createdAt)}</span>
              </div>
              {trip.submittedAt && (
                <div>
                  <span className="text-slate-500">Gửi duyệt:</span>
                  <span className="ml-2 text-slate-900">{formatDateTime(trip.submittedAt)}</span>
                </div>
              )}
              {trip.approvedAt && (
                <div>
                  <span className="text-slate-500">Duyệt:</span>
                  <span className="ml-2 text-green-600">{formatDateTime(trip.approvedAt)}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-md mx-4 p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Từ chối chuyến</h3>

            <div className="space-y-3 mb-4">
              <label className="block text-sm font-medium text-slate-700">Lý do từ chối</label>
              {REJECTION_REASONS.map((reason) => (
                <label key={reason} className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="radio"
                    name="rejectReason"
                    value={reason}
                    checked={rejectReason === reason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    className="text-primary-600"
                  />
                  <span className="text-sm text-slate-700">{reason}</span>
                </label>
              ))}
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="rejectReason"
                  value="other"
                  checked={rejectReason === 'other'}
                  onChange={(e) => setRejectReason(e.target.value)}
                  className="text-primary-600"
                />
                <span className="text-sm text-slate-700">Lý do khác</span>
              </label>

              {rejectReason === 'other' && (
                <textarea
                  className="input-field w-full resize-none"
                  rows={3}
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  placeholder="Nhập lý do..."
                />
              )}
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectReason('');
                  setCustomReason('');
                }}
                className="btn-secondary"
                disabled={processing}
              >
                Hủy
              </button>
              <button
                onClick={handleReject}
                className="btn-primary bg-red-600 hover:bg-red-700"
                disabled={processing || (!rejectReason || (rejectReason === 'other' && !customReason.trim()))}
              >
                {processing ? 'Đang xử lý...' : 'Từ chối'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
