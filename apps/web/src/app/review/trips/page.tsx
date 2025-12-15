'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  reviewTrips,
  referenceData,
  Trip,
  TripStatus,
  Vehicle,
  Route,
  Driver,
} from '@/lib/api';

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

export default function ReviewQueuePage() {
  // Data
  const [trips, setTrips] = useState<Trip[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Reference data for filters
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);

  // Filters
  const [status, setStatus] = useState<string>('PENDING');
  const [driverId, setDriverId] = useState('');
  const [vehicleId, setVehicleId] = useState('');
  const [routeId, setRouteId] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Load reference data on mount
  useEffect(() => {
    loadReferenceData();
  }, []);

  // Load trips when filters change
  useEffect(() => {
    loadTrips();
  }, [status, driverId, vehicleId, routeId, dateFrom, dateTo]);

  const loadReferenceData = async () => {
    try {
      const [vehiclesData, routesData, driversData] = await Promise.all([
        referenceData.vehicles(),
        referenceData.routes(),
        referenceData.drivers(),
      ]);
      setVehicles(vehiclesData);
      setRoutes(routesData);
      setDrivers(driversData);
    } catch (err) {
      console.error('Failed to load reference data:', err);
    }
  };

  const loadTrips = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const result = await reviewTrips.getQueue({
        status: status || undefined,
        driverId: driverId || undefined,
        vehicleId: vehicleId || undefined,
        routeId: routeId || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        limit: 100,
      });
      setTrips(result.trips);
      setTotal(result.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi tải dữ liệu');
    } finally {
      setLoading(false);
    }
  }, [status, driverId, vehicleId, routeId, dateFrom, dateTo]);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('vi-VN');
  };

  const formatWeight = (weight?: number) => {
    if (!weight) return '-';
    return `${Number(weight).toFixed(2)}T`;
  };

  const clearFilters = () => {
    setStatus('PENDING');
    setDriverId('');
    setVehicleId('');
    setRouteId('');
    setDateFrom('');
    setDateTo('');
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Duyệt chuyến</h2>
          <p className="text-sm text-slate-500">
            {total} chuyến {status === 'PENDING' ? 'chờ duyệt' : ''}
          </p>
        </div>
        <button
          onClick={loadTrips}
          className="btn-secondary flex items-center gap-2"
          disabled={loading}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Làm mới
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-slate-200 p-4 mb-6">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {/* Status */}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Trạng thái</label>
            <select
              className="input-field text-sm"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="">Tất cả</option>
              <option value="PENDING">Chờ duyệt</option>
              <option value="APPROVED">Đã duyệt</option>
              <option value="REJECTED">Từ chối</option>
              <option value="DRAFT">Nháp</option>
            </select>
          </div>

          {/* Driver */}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Tài xế</label>
            <select
              className="input-field text-sm"
              value={driverId}
              onChange={(e) => setDriverId(e.target.value)}
            >
              <option value="">Tất cả</option>
              {drivers.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          {/* Vehicle */}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Xe</label>
            <select
              className="input-field text-sm"
              value={vehicleId}
              onChange={(e) => setVehicleId(e.target.value)}
            >
              <option value="">Tất cả</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.plateNo}
                </option>
              ))}
            </select>
          </div>

          {/* Route */}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Tuyến</label>
            <select
              className="input-field text-sm"
              value={routeId}
              onChange={(e) => setRouteId(e.target.value)}
            >
              <option value="">Tất cả</option>
              {routes.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>

          {/* Date From */}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Từ ngày</label>
            <input
              type="date"
              className="input-field text-sm"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </div>

          {/* Date To */}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Đến ngày</label>
            <input
              type="date"
              className="input-field text-sm"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </div>
        </div>

        {/* Clear filters */}
        {(driverId || vehicleId || routeId || dateFrom || dateTo || status !== 'PENDING') && (
          <button
            onClick={clearFilters}
            className="mt-3 text-sm text-primary-600 hover:text-primary-700"
          >
            Xóa bộ lọc
          </button>
        )}
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
        ) : trips.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            Không có chuyến nào
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Mã chuyến</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Tài xế</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Xe</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Tuyến</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Ngày</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-slate-500 uppercase">K.lượng</th>
                  <th className="text-center px-4 py-3 text-xs font-medium text-slate-500 uppercase">Trạng thái</th>
                  <th className="text-center px-4 py-3 text-xs font-medium text-slate-500 uppercase">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {trips.map((trip) => (
                  <tr key={trip.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <span className="font-mono text-sm text-slate-900">{trip.tripCode}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm text-slate-900">{trip.driver.name}</div>
                      <div className="text-xs text-slate-500">{trip.driver.employeeCode}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-slate-900">{trip.vehicle.plateNo}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-slate-900">{trip.route.name}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-slate-900">{formatDate(trip.tripDate)}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-sm font-medium text-slate-900">
                        {formatWeight(trip.weightLoaded)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex px-2 py-1 rounded text-xs font-medium ${statusColors[trip.status]}`}>
                        {statusLabels[trip.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Link
                        href={`/review/trips/${trip.id}`}
                        className="text-primary-600 hover:text-primary-700 text-sm font-medium"
                      >
                        Xem
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
