'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { salaryApi, SalaryPeriodDetail, SalaryResult, RecalculateResult } from '@/lib/api';
import { getToken } from '@/lib/auth';

const statusLabels: Record<string, string> = {
  OPEN: 'Mở',
  CALCULATING: 'Đang tính',
  REVIEW: 'Chờ duyệt',
  LOCKED: 'Đã chốt',
};

const statusColors: Record<string, string> = {
  OPEN: 'bg-green-100 text-green-700',
  CALCULATING: 'bg-amber-100 text-amber-700',
  REVIEW: 'bg-blue-100 text-blue-700',
  LOCKED: 'bg-slate-100 text-slate-700',
};

export default function SalaryPeriodDetailPage() {
  const params = useParams();
  const router = useRouter();
  const periodId = params.id as string;

  const [period, setPeriod] = useState<SalaryPeriodDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Action states
  const [processing, setProcessing] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState<'recalculate' | 'close' | null>(null);
  const [recalcResult, setRecalcResult] = useState<RecalculateResult | null>(null);

  useEffect(() => {
    loadPeriod();
  }, [periodId]);

  const loadPeriod = async () => {
    try {
      setLoading(true);
      const data = await salaryApi.getPeriod(periodId);
      setPeriod(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi tải dữ liệu');
    } finally {
      setLoading(false);
    }
  };

  const handleRecalculate = async () => {
    try {
      setProcessing(true);
      setError('');
      const result = await salaryApi.recalculate(periodId);
      setRecalcResult(result);
      setShowConfirmModal(null);
      await loadPeriod();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi tính lương');
    } finally {
      setProcessing(false);
    }
  };

  const handleClose = async () => {
    try {
      setProcessing(true);
      setError('');
      await salaryApi.closePeriod(periodId);
      setShowConfirmModal(null);
      await loadPeriod();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi chốt kỳ');
    } finally {
      setProcessing(false);
    }
  };

  const handleExport = () => {
    const token = getToken();
    const url = salaryApi.exportUrl(periodId);
    // Open in new tab with auth header via fetch
    window.open(`${url}?token=${token}`, '_blank');
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('vi-VN');
  };

  const formatCurrency = (amount: number) => {
    return Number(amount).toLocaleString('vi-VN') + ' VND';
  };

  const formatWeight = (weight: number) => {
    return Number(weight).toFixed(2) + ' tấn';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="spinner border-primary-500 border-t-transparent"></div>
      </div>
    );
  }

  if (!period) {
    return (
      <div className="p-6">
        <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm mb-4">
          {error || 'Không tìm thấy kỳ lương'}
        </div>
        <Link href="/hr/salary/periods" className="btn-secondary">
          Quay lại
        </Link>
      </div>
    );
  }

  const isLocked = period.status === 'LOCKED';
  const totalWeight = period.results.reduce((sum, r) => sum + Number(r.totalWeight), 0);
  const totalAmount = period.results.reduce((sum, r) => sum + Number(r.totalSalary), 0);
  const totalTrips = period.results.reduce((sum, r) => sum + r.totalTrips, 0);

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link
            href="/hr/salary/periods"
            className="p-2 -ml-2 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div>
            <h2 className="text-xl font-semibold text-slate-900">{period.name}</h2>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-sm text-slate-500">
                {formatDate(period.periodStart)} - {formatDate(period.periodEnd)}
              </span>
              <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${statusColors[period.status]}`}>
                {statusLabels[period.status]}
              </span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          {!isLocked && (
            <>
              <button
                onClick={() => setShowConfirmModal('recalculate')}
                className="btn-secondary"
                disabled={processing}
              >
                Tính lại
              </button>
              <button
                onClick={() => setShowConfirmModal('close')}
                className="btn-primary bg-green-600 hover:bg-green-700"
                disabled={processing || period.results.length === 0}
              >
                Chốt kỳ
              </button>
            </>
          )}
          <a
            href={salaryApi.exportUrl(periodId)}
            className="btn-secondary"
            target="_blank"
            rel="noopener noreferrer"
          >
            Xuất Excel
          </a>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm mb-4">
          {error}
        </div>
      )}

      {/* Recalc Result */}
      {recalcResult && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
          <h4 className="font-medium text-green-800 mb-2">Tính lương thành công!</h4>
          <div className="grid grid-cols-4 gap-4 text-sm text-green-700">
            <div>
              <span className="block text-green-600">Tài xế</span>
              <span className="font-semibold">{recalcResult.summary.totalDrivers}</span>
            </div>
            <div>
              <span className="block text-green-600">Chuyến</span>
              <span className="font-semibold">{recalcResult.summary.totalTrips}</span>
            </div>
            <div>
              <span className="block text-green-600">Tổng tấn</span>
              <span className="font-semibold">{recalcResult.summary.totalWeight.toFixed(2)}</span>
            </div>
            <div>
              <span className="block text-green-600">Tổng tiền</span>
              <span className="font-semibold">{formatCurrency(recalcResult.summary.totalAmount)}</span>
            </div>
          </div>
          <p className="text-xs text-green-600 mt-2">
            Rule: {recalcResult.summary.ruleUsed.name} ({formatCurrency(recalcResult.summary.ruleUsed.ratePerTon)}/tấn)
          </p>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <p className="text-sm text-slate-500">Tài xế</p>
          <p className="text-2xl font-semibold text-slate-900">{period.results.length}</p>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <p className="text-sm text-slate-500">Số chuyến</p>
          <p className="text-2xl font-semibold text-slate-900">{totalTrips}</p>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <p className="text-sm text-slate-500">Tổng tấn</p>
          <p className="text-2xl font-semibold text-slate-900">{formatWeight(totalWeight)}</p>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <p className="text-sm text-slate-500">Tổng tiền</p>
          <p className="text-2xl font-semibold text-primary-600">{formatCurrency(totalAmount)}</p>
        </div>
      </div>

      {/* Results Table */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 bg-slate-50">
          <h3 className="font-medium text-slate-900">Chi tiết theo tài xế</h3>
        </div>
        {period.results.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            <p>Chưa có kết quả. Nhấn "Tính lại" để tính lương.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Mã NV</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Họ tên</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-slate-500 uppercase">Số chuyến</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-slate-500 uppercase">Tổng tấn</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-slate-500 uppercase">Thành tiền</th>
                  <th className="text-center px-4 py-3 text-xs font-medium text-slate-500 uppercase">Chi tiết</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {period.results.map((result) => (
                  <tr key={result.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <span className="font-mono text-sm text-slate-900">{result.driver.employeeCode}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-slate-900">{result.driver.name}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-sm text-slate-900">{result.totalTrips}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-sm text-slate-900">{formatWeight(result.totalWeight)}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-sm font-medium text-slate-900">{formatCurrency(result.totalSalary)}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Link
                        href={`/hr/salary/periods/${periodId}/drivers/${result.driverId}`}
                        className="text-primary-600 hover:text-primary-700 text-sm"
                      >
                        Xem
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-50 border-t border-slate-200">
                <tr>
                  <td colSpan={2} className="px-4 py-3 font-medium text-slate-900">TỔNG</td>
                  <td className="px-4 py-3 text-right font-medium text-slate-900">{totalTrips}</td>
                  <td className="px-4 py-3 text-right font-medium text-slate-900">{formatWeight(totalWeight)}</td>
                  <td className="px-4 py-3 text-right font-medium text-primary-600">{formatCurrency(totalAmount)}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Confirm Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-md mx-4 p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">
              {showConfirmModal === 'recalculate' ? 'Tính lại lương?' : 'Chốt kỳ lương?'}
            </h3>
            <p className="text-slate-600 mb-6">
              {showConfirmModal === 'recalculate'
                ? 'Hệ thống sẽ tính lại lương cho tất cả tài xế dựa trên chuyến đã duyệt trong kỳ.'
                : 'Sau khi chốt, kỳ lương sẽ không thể thay đổi. Bạn chắc chắn muốn chốt?'}
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowConfirmModal(null)}
                className="btn-secondary"
                disabled={processing}
              >
                Hủy
              </button>
              <button
                onClick={showConfirmModal === 'recalculate' ? handleRecalculate : handleClose}
                className={`btn-primary ${showConfirmModal === 'close' ? 'bg-green-600 hover:bg-green-700' : ''}`}
                disabled={processing}
              >
                {processing ? 'Đang xử lý...' : (showConfirmModal === 'recalculate' ? 'Tính lại' : 'Chốt kỳ')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
