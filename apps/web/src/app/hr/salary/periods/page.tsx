'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { salaryApi, SalaryPeriod } from '@/lib/api';

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

export default function SalaryPeriodsPage() {
  const [periods, setPeriods] = useState<SalaryPeriod[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Create form
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    periodStart: '',
    periodEnd: '',
  });

  useEffect(() => {
    loadPeriods();
  }, []);

  const loadPeriods = async () => {
    try {
      setLoading(true);
      const data = await salaryApi.listPeriods();
      setPeriods(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi tải dữ liệu');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setCreating(true);
      setError('');
      await salaryApi.createPeriod(formData);
      setShowCreateModal(false);
      setFormData({ name: '', periodStart: '', periodEnd: '' });
      loadPeriods();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi tạo kỳ lương');
    } finally {
      setCreating(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('vi-VN');
  };

  // Auto-generate period name when dates change
  useEffect(() => {
    if (formData.periodStart) {
      const start = new Date(formData.periodStart);
      const month = start.getMonth() + 1;
      const year = start.getFullYear();
      const day = start.getDate();
      const periodNum = day <= 15 ? 1 : 2;
      setFormData((prev) => ({
        ...prev,
        name: `Kỳ ${periodNum} tháng ${month}/${year}`,
      }));
    }
  }, [formData.periodStart]);

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Bảng lương</h2>
          <p className="text-sm text-slate-500">{periods.length} kỳ lương</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn-primary"
        >
          + Tạo kỳ mới
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm mb-4">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="spinner border-primary-500 border-t-transparent"></div>
          </div>
        ) : periods.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            Chưa có kỳ lương nào
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Mã kỳ</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Tên</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Thời gian</th>
                  <th className="text-center px-4 py-3 text-xs font-medium text-slate-500 uppercase">Số NV</th>
                  <th className="text-center px-4 py-3 text-xs font-medium text-slate-500 uppercase">Trạng thái</th>
                  <th className="text-center px-4 py-3 text-xs font-medium text-slate-500 uppercase">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {periods.map((period) => (
                  <tr key={period.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <span className="font-mono text-sm text-slate-900">{period.code}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-slate-900">{period.name}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-slate-600">
                        {formatDate(period.periodStart)} - {formatDate(period.periodEnd)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-sm text-slate-900">
                        {period._count?.results || 0}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex px-2 py-1 rounded text-xs font-medium ${statusColors[period.status]}`}>
                        {statusLabels[period.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Link
                        href={`/hr/salary/periods/${period.id}`}
                        className="text-primary-600 hover:text-primary-700 text-sm font-medium"
                      >
                        Chi tiết
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-md mx-4 p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Tạo kỳ lương mới</h3>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Ngày bắt đầu
                </label>
                <input
                  type="date"
                  className="input-field w-full"
                  value={formData.periodStart}
                  onChange={(e) => setFormData({ ...formData, periodStart: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Ngày kết thúc
                </label>
                <input
                  type="date"
                  className="input-field w-full"
                  value={formData.periodEnd}
                  onChange={(e) => setFormData({ ...formData, periodEnd: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Tên kỳ
                </label>
                <input
                  type="text"
                  className="input-field w-full"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="VD: Kỳ 1 tháng 12/2025"
                  required
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="btn-secondary"
                  disabled={creating}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={creating}
                >
                  {creating ? 'Đang tạo...' : 'Tạo kỳ'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
