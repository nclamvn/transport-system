'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  analyticsApi,
  OverviewData,
  TonsByDay,
  TopDriver,
  ExceptionTrip,
} from '@/lib/api';

type DatePreset = '7d' | '30d' | 'custom';

export default function DashboardPage() {
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [tonsByDay, setTonsByDay] = useState<TonsByDay[]>([]);
  const [topDrivers, setTopDrivers] = useState<TopDriver[]>([]);
  const [exceptions, setExceptions] = useState<ExceptionTrip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Date filter state
  const [preset, setPreset] = useState<DatePreset>('7d');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');

  const getDateRange = useCallback(() => {
    if (preset === 'custom' && customFrom && customTo) {
      return { from: customFrom, to: customTo };
    }

    const to = new Date();
    const from = new Date();
    if (preset === '7d') {
      from.setDate(from.getDate() - 7);
    } else if (preset === '30d') {
      from.setDate(from.getDate() - 30);
    }

    return {
      from: from.toISOString().split('T')[0],
      to: to.toISOString().split('T')[0],
    };
  }, [preset, customFrom, customTo]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const range = getDateRange();

      const [overviewData, tonsData, driversData, exceptionsData] = await Promise.all([
        analyticsApi.getOverview(range),
        analyticsApi.getTonsByDay(range),
        analyticsApi.getTopDrivers({ ...range, limit: 10 }),
        analyticsApi.getExceptions({ ...range, limit: 20 }),
      ]);

      setOverview(overviewData);
      setTonsByDay(tonsData);
      setTopDrivers(driversData);
      setExceptions(exceptionsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi tải dữ liệu');
    } finally {
      setLoading(false);
    }
  }, [getDateRange]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handlePresetChange = (newPreset: DatePreset) => {
    setPreset(newPreset);
  };

  const handleCustomSearch = () => {
    if (customFrom && customTo) {
      setPreset('custom');
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('vi-VN');
  };

  const formatCurrency = (amount: number) => {
    return Number(amount).toLocaleString('vi-VN') + ' đ';
  };

  const formatWeight = (weight: number) => {
    return Number(weight).toFixed(2);
  };

  // Calculate max tons for chart scaling
  const maxTons = Math.max(...tonsByDay.map((d) => d.tons), 1);

  if (loading && !overview) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="spinner border-primary-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Page Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-slate-900">Tổng quan</h2>

        {/* Date Filter */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => handlePresetChange('7d')}
            className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
              preset === '7d'
                ? 'bg-primary-600 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            7 ngày
          </button>
          <button
            onClick={() => handlePresetChange('30d')}
            className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
              preset === '30d'
                ? 'bg-primary-600 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            30 ngày
          </button>
          <div className="flex items-center gap-1 ml-2">
            <input
              type="date"
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
              className="px-2 py-1.5 text-sm border border-slate-300 rounded-md"
            />
            <span className="text-slate-400">-</span>
            <input
              type="date"
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
              className="px-2 py-1.5 text-sm border border-slate-300 rounded-md"
            />
            <button
              onClick={handleCustomSearch}
              disabled={!customFrom || !customTo}
              className="px-3 py-1.5 text-sm bg-slate-100 text-slate-700 rounded-md hover:bg-slate-200 disabled:opacity-50"
            >
              Lọc
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm mb-6">
          {error}
        </div>
      )}

      {/* Overview Cards */}
      {overview && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg border border-slate-200 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-slate-500">Tổng chuyến</p>
                <p className="text-2xl font-semibold text-slate-900">{overview.totalTrips}</p>
              </div>
            </div>
            <div className="mt-3 flex gap-2 text-xs">
              <span className="text-green-600">{overview.approvedTrips} đã duyệt</span>
              <span className="text-slate-400">|</span>
              <span className="text-slate-500">{overview.draftTrips} nháp</span>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-slate-200 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-slate-500">Tổng tấn</p>
                <p className="text-2xl font-semibold text-slate-900">{formatWeight(overview.totalTons)}</p>
              </div>
            </div>
            <div className="mt-3 text-xs text-slate-500">
              Chỉ tính chuyến đã duyệt ({overview.approvedTrips} chuyến)
            </div>
          </div>

          <div className="bg-white rounded-lg border border-slate-200 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center">
                <svg className="w-5 h-5 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-slate-500">Chờ duyệt</p>
                <p className="text-2xl font-semibold text-yellow-600">{overview.pendingTrips}</p>
              </div>
            </div>
            <div className="mt-3 text-xs text-slate-500">
              {overview.activeDrivers} tài xế hoạt động
            </div>
          </div>

          <div className="bg-white rounded-lg border border-slate-200 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-slate-500">Từ chối</p>
                <p className="text-2xl font-semibold text-red-600">{overview.rejectedTrips}</p>
              </div>
            </div>
            <div className="mt-3 text-xs text-slate-500">
              {overview.activeVehicles} xe hoạt động
            </div>
          </div>
        </div>
      )}

      {/* Tons by Day Chart */}
      <div className="bg-white rounded-lg border border-slate-200 mb-6">
        <div className="px-4 py-3 border-b border-slate-200">
          <h3 className="font-medium text-slate-900">Sản lượng theo ngày (tấn)</h3>
        </div>
        <div className="p-4">
          {tonsByDay.length === 0 ? (
            <div className="text-center py-8 text-slate-500">Không có dữ liệu</div>
          ) : (
            <div className="flex items-end gap-1 h-48 overflow-x-auto">
              {tonsByDay.map((day) => {
                const heightPercent = maxTons > 0 ? (day.tons / maxTons) * 100 : 0;
                return (
                  <div key={day.date} className="flex flex-col items-center min-w-[40px] flex-1">
                    <div className="text-xs text-slate-600 mb-1">{formatWeight(day.tons)}</div>
                    <div
                      className="w-full bg-primary-500 rounded-t transition-all hover:bg-primary-600"
                      style={{ height: `${Math.max(heightPercent, 2)}%` }}
                      title={`${day.date}: ${formatWeight(day.tons)} tấn (${day.trips} chuyến)`}
                    />
                    <div className="text-xs text-slate-400 mt-1 transform -rotate-45 origin-left whitespace-nowrap">
                      {day.date.slice(5)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Two column layout for tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Drivers */}
        <div className="bg-white rounded-lg border border-slate-200">
          <div className="px-4 py-3 border-b border-slate-200">
            <h3 className="font-medium text-slate-900">Top tài xế</h3>
          </div>
          {topDrivers.length === 0 ? (
            <div className="text-center py-8 text-slate-500">Không có dữ liệu</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-left px-4 py-2 text-xs font-medium text-slate-500">#</th>
                    <th className="text-left px-4 py-2 text-xs font-medium text-slate-500">Tài xế</th>
                    <th className="text-right px-4 py-2 text-xs font-medium text-slate-500">Chuyến</th>
                    <th className="text-right px-4 py-2 text-xs font-medium text-slate-500">Tấn</th>
                    <th className="text-right px-4 py-2 text-xs font-medium text-slate-500">TB/chuyến</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {topDrivers.map((driver, index) => (
                    <tr key={driver.driverId} className="hover:bg-slate-50">
                      <td className="px-4 py-2 text-sm text-slate-500">{index + 1}</td>
                      <td className="px-4 py-2">
                        <div className="text-sm font-medium text-slate-900">{driver.driverName}</div>
                        <div className="text-xs text-slate-500">{driver.employeeCode}</div>
                      </td>
                      <td className="px-4 py-2 text-right text-sm text-slate-900">{driver.trips}</td>
                      <td className="px-4 py-2 text-right text-sm font-medium text-slate-900">
                        {formatWeight(driver.tons)}
                      </td>
                      <td className="px-4 py-2 text-right text-sm text-slate-600">
                        {formatWeight(driver.avgTonsPerTrip)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Exceptions */}
        <div className="bg-white rounded-lg border border-slate-200">
          <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
            <h3 className="font-medium text-slate-900">Chuyến từ chối</h3>
            {exceptions.length > 0 && (
              <span className="text-xs text-slate-500">{exceptions.length} chuyến</span>
            )}
          </div>
          {exceptions.length === 0 ? (
            <div className="text-center py-8 text-slate-500">Không có chuyến từ chối</div>
          ) : (
            <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
              {exceptions.map((exc) => (
                <div key={exc.tripId} className="px-4 py-3 hover:bg-slate-50">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm text-slate-900">{exc.tripCode}</span>
                        <span className="text-xs text-slate-400">{formatDate(exc.tripDate)}</span>
                      </div>
                      <div className="text-sm text-slate-600 mt-0.5">
                        {exc.driverName} - {exc.vehiclePlate}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {exc.routeName}
                      </div>
                    </div>
                  </div>
                  {exc.rejectionReason && (
                    <div className="mt-2 px-2 py-1 bg-red-50 rounded text-sm text-red-700">
                      {exc.rejectionReason}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Amount Estimation Note */}
      {overview && overview.totalAmount > 0 && (
        <div className="mt-6 text-sm text-slate-500">
          Tổng tiền ước tính: <span className="font-medium text-slate-700">{formatCurrency(overview.totalAmount)}</span>
          {overview.amountSource === 'estimated' && (
            <span className="ml-2 text-xs text-slate-400">(ước tính từ đơn giá hiện tại)</span>
          )}
          {overview.amountSource === 'salary_period' && (
            <span className="ml-2 text-xs text-slate-400">(từ kỳ lương đã khóa)</span>
          )}
        </div>
      )}
    </div>
  );
}
