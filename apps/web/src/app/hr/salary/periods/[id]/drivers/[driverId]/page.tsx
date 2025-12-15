'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { salaryApi, SalaryResultDetail, CalculationBreakdown } from '@/lib/api';

export default function DriverSalaryDetailPage() {
  const params = useParams();
  const periodId = params.id as string;
  const driverId = params.driverId as string;

  const [result, setResult] = useState<SalaryResultDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadResult();
  }, [periodId, driverId]);

  const loadResult = async () => {
    try {
      setLoading(true);
      const data = await salaryApi.getDriverResult(periodId, driverId);
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi tải dữ liệu');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('vi-VN');
  };

  const formatCurrency = (amount: number) => {
    return Number(amount).toLocaleString('vi-VN') + ' VND';
  };

  const formatWeight = (weight: number) => {
    return Number(weight).toFixed(2);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="spinner border-primary-500 border-t-transparent"></div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="p-6">
        <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm mb-4">
          {error || 'Không tìm thấy kết quả'}
        </div>
        <Link href={`/hr/salary/periods/${periodId}`} className="btn-secondary">
          Quay lại
        </Link>
      </div>
    );
  }

  const breakdown = result.calculationDetails as CalculationBreakdown[] | undefined;

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link
          href={`/hr/salary/periods/${periodId}`}
          className="p-2 -ml-2 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div>
          <h2 className="text-xl font-semibold text-slate-900">
            {result.driver.name} ({result.driver.employeeCode})
          </h2>
          <p className="text-sm text-slate-500">{result.period.name}</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <p className="text-sm text-slate-500">Số chuyến</p>
          <p className="text-2xl font-semibold text-slate-900">{result.totalTrips}</p>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <p className="text-sm text-slate-500">Tổng tấn</p>
          <p className="text-2xl font-semibold text-slate-900">{formatWeight(result.totalWeight)} tấn</p>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <p className="text-sm text-slate-500">Lương cơ bản</p>
          <p className="text-2xl font-semibold text-slate-900">{formatCurrency(result.baseSalary)}</p>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <p className="text-sm text-slate-500">Tổng lương</p>
          <p className="text-2xl font-semibold text-primary-600">{formatCurrency(result.totalSalary)}</p>
        </div>
      </div>

      {/* Breakdown Table */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 bg-slate-50">
          <h3 className="font-medium text-slate-900">Chi tiết chuyến</h3>
        </div>
        {!breakdown || breakdown.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            Không có dữ liệu chi tiết
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Mã chuyến</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Ngày</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Tuyến</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-slate-500 uppercase">Tấn</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-slate-500 uppercase">Đơn giá</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-slate-500 uppercase">Thành tiền</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {breakdown.map((item, index) => (
                  <tr key={index} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <span className="font-mono text-sm text-slate-900">{item.tripCode}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-slate-600">{formatDate(item.tripDate)}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-slate-900">{item.routeName}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-sm text-slate-900">{formatWeight(item.weight)}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-sm text-slate-600">{formatCurrency(item.ratePerTon)}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-sm font-medium text-slate-900">{formatCurrency(item.amount)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-50 border-t border-slate-200">
                <tr>
                  <td colSpan={3} className="px-4 py-3 font-medium text-slate-900">TỔNG</td>
                  <td className="px-4 py-3 text-right font-medium text-slate-900">
                    {formatWeight(breakdown.reduce((sum, i) => sum + i.weight, 0))}
                  </td>
                  <td></td>
                  <td className="px-4 py-3 text-right font-medium text-primary-600">
                    {formatCurrency(breakdown.reduce((sum, i) => sum + i.amount, 0))}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Calculation Info */}
      <div className="mt-6 text-sm text-slate-500">
        <p>Tính lúc: {new Date(result.calculatedAt).toLocaleString('vi-VN')}</p>
        {result.ruleVersionUsed && <p>Rule ID: {result.ruleVersionUsed}</p>}
      </div>
    </div>
  );
}
