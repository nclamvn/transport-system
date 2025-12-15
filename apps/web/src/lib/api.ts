const API_BASE = '/api';

interface ApiOptions {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
}

class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(endpoint: string, options: ApiOptions = {}): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Request failed' }));
    throw new ApiError(response.status, error.message || 'Request failed');
  }

  return response.json();
}

async function uploadFile<T>(
  endpoint: string,
  file: File,
  data?: Record<string, string>,
): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  const formData = new FormData();
  formData.append('file', file);

  if (data) {
    Object.entries(data).forEach(([key, value]) => {
      formData.append(key, value);
    });
  }

  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    method: 'POST',
    headers,
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Upload failed' }));
    throw new ApiError(response.status, error.message || 'Upload failed');
  }

  return response.json();
}

// Auth
export const auth = {
  login: (email: string, password: string) =>
    request<{ access_token: string; user: User }>('/auth/login', {
      method: 'POST',
      body: { email, password },
    }),
  profile: () => request<User>('/auth/profile'),
};

// Trips (Driver endpoints)
export const driverTrips = {
  list: (params?: { status?: string; limit?: number }) => {
    const query = new URLSearchParams();
    if (params?.status) query.set('status', params.status);
    if (params?.limit) query.set('limit', params.limit.toString());
    return request<{ trips: Trip[]; total: number }>(`/trips/my?${query}`);
  },
  get: (id: string) => request<Trip>(`/trips/my/${id}`),
  getById: (id: string) => request<Trip>(`/trips/my/${id}`),
  create: (data: CreateTripInput) =>
    request<Trip>('/trips/my', { method: 'POST', body: data }),
  submit: (id: string) =>
    request<Trip>(`/trips/my/${id}/submit`, { method: 'POST' }),
  uploadAttachment: (id: string, file: File, data?: Record<string, string>) =>
    uploadFile<Attachment>(`/trips/my/${id}/attachments`, file, data),
};

// Reference data
export const referenceData = {
  vehicles: () => request<Vehicle[]>('/vehicles?active=true'),
  routes: () => request<Route[]>('/routes?active=true'),
  stations: () => request<Station[]>('/stations?active=true'),
  drivers: () => request<Driver[]>('/drivers?active=true'),
};

// Review endpoints (DISPATCHER/HR/ADMIN)
export const reviewTrips = {
  getQueue: (params?: ReviewQueueParams) => {
    const query = new URLSearchParams();
    if (params?.status) query.set('status', params.status);
    if (params?.driverId) query.set('driverId', params.driverId);
    if (params?.vehicleId) query.set('vehicleId', params.vehicleId);
    if (params?.routeId) query.set('routeId', params.routeId);
    if (params?.dateFrom) query.set('dateFrom', params.dateFrom);
    if (params?.dateTo) query.set('dateTo', params.dateTo);
    if (params?.limit) query.set('limit', params.limit.toString());
    return request<{ trips: Trip[]; total: number }>(`/trips/review-queue?${query}`);
  },
  getById: (id: string, includeAudit = true) =>
    request<TripDetail>(`/trips/${id}?includeAudit=${includeAudit}`),
  approve: (id: string, weightFinal?: number) =>
    request<Trip>(`/trips/${id}/approve`, {
      method: 'POST',
      body: { weightFinal },
    }),
  reject: (id: string, reason: string) =>
    request<Trip>(`/trips/${id}/reject`, {
      method: 'POST',
      body: { reason },
    }),
};

export interface ReviewQueueParams {
  status?: string;
  driverId?: string;
  vehicleId?: string;
  routeId?: string;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
}

export interface Driver {
  id: string;
  employeeCode: string;
  name: string;
  phone?: string;
}

export interface TripDetail extends Trip {
  auditLogs?: AuditLog[];
}

export interface AuditLog {
  id: string;
  action: string;
  changes: Record<string, unknown>;
  userEmail: string;
  createdAt: string;
}

// Salary API (HR/Admin)
export const salaryApi = {
  // Periods
  listPeriods: (params?: { status?: string }) => {
    const query = new URLSearchParams();
    if (params?.status) query.set('status', params.status);
    return request<SalaryPeriod[]>(`/salary/periods?${query}`);
  },
  createPeriod: (data: { name: string; periodStart: string; periodEnd: string }) =>
    request<SalaryPeriod>('/salary/periods', { method: 'POST', body: data }),
  getPeriod: (id: string) =>
    request<SalaryPeriodDetail>(`/salary/periods/${id}`),
  recalculate: (id: string) =>
    request<RecalculateResult>(`/salary/periods/${id}/recalculate`, { method: 'POST' }),
  getResults: (periodId: string) =>
    request<{ period: SalaryPeriod; results: SalaryResult[] }>(`/salary/periods/${periodId}/results`),
  getDriverResult: (periodId: string, driverId: string) =>
    request<SalaryResultDetail>(`/salary/periods/${periodId}/results/${driverId}`),
  closePeriod: (id: string) =>
    request<SalaryPeriod>(`/salary/periods/${id}/close`, { method: 'POST' }),
  exportUrl: (id: string) => `/api/salary/periods/${id}/export.xlsx`,

  // Rules
  listRules: () => request<SalaryRule[]>('/salary/rules'),
  createRule: (data: { name: string; ratePerTon: number; effectiveFrom: string }) =>
    request<SalaryRule>('/salary/rules', { method: 'POST', body: data }),
};

export interface SalaryPeriod {
  id: string;
  code: string;
  name: string;
  periodStart: string;
  periodEnd: string;
  status: 'OPEN' | 'CALCULATING' | 'REVIEW' | 'LOCKED';
  lockedAt?: string;
  createdAt: string;
  _count?: { results: number };
}

export interface SalaryPeriodDetail extends SalaryPeriod {
  results: SalaryResult[];
}

export interface SalaryResult {
  id: string;
  periodId: string;
  driverId: string;
  driver: {
    id: string;
    employeeCode: string;
    name: string;
    phone?: string;
  };
  totalTrips: number;
  totalWeight: number;
  baseSalary: number;
  bonus: number;
  penalty: number;
  allowance: number;
  totalSalary: number;
  calculationDetails?: CalculationBreakdown[];
  calculatedAt: string;
  ruleVersionUsed?: string;
}

export interface SalaryResultDetail extends SalaryResult {
  period: SalaryPeriod;
}

export interface CalculationBreakdown {
  tripId: string;
  tripCode: string;
  tripDate: string;
  routeName: string;
  weight: number;
  ratePerTon: number;
  amount: number;
}

export interface RecalculateResult {
  period: SalaryPeriod;
  summary: {
    totalDrivers: number;
    totalTrips: number;
    totalWeight: number;
    totalAmount: number;
    ruleUsed: {
      id: string;
      name: string;
      ratePerTon: number;
    };
  };
}

export interface SalaryRule {
  id: string;
  name: string;
  description?: string;
  version: number;
  isActive: boolean;
  effectiveFrom: string;
  effectiveTo?: string;
  rateAmount: number;
  routeId?: string;
  route?: { id: string; code: string; name: string };
}

// Types
export interface User {
  id: string;
  email: string;
  name: string;
  roles: string[];
  driverId?: string;
}

export interface Trip {
  id: string;
  tripCode: string;
  driver: { id: string; employeeCode: string; name: string };
  vehicle: { id: string; plateNo: string; vehicleType?: string };
  route: { id: string; code: string; name: string };
  origin: { id: string; code: string; name: string };
  destination: { id: string; code: string; name: string };
  tripDate: string;
  departureTime?: string;
  arrivalTime?: string;
  weightLoaded?: number;
  weightUnloaded?: number;
  weightFinal?: number;
  status: TripStatus;
  note?: string;
  rejectionReason?: string;
  records?: Attachment[];
  attachments?: Attachment[]; // alias for records
  submittedAt?: string;
  approvedAt?: string;
  createdAt: string;
}

export interface Attachment {
  id: string;
  recordType: string;
  ticketNo?: string;
  weight?: number;
  fileUrl?: string;
  url?: string; // alias for fileUrl
  fileName?: string;
}

export interface CreateTripInput {
  vehicleId: string;
  routeId: string;
  originId: string;
  destinationId: string;
  tripDate: string;
  departureTime?: string;
  weightLoaded?: number;
  note?: string;
}

export interface Vehicle {
  id: string;
  plateNo: string;
  vehicleType: string;
  capacity?: number;
}

export interface Route {
  id: string;
  code: string;
  name: string;
  origin: Station;
  destination: Station;
  distance?: number;
}

export interface Station {
  id: string;
  code: string;
  name: string;
  type: string;
}

export type TripStatus = 'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXCEPTION';

// Analytics API (ADMIN/DISPATCHER/HR)
export const analyticsApi = {
  getOverview: (params?: DateRangeParams) => {
    const query = buildDateQuery(params);
    return request<OverviewData>(`/analytics/overview?${query}`);
  },
  getTonsByDay: (params?: DateRangeParams) => {
    const query = buildDateQuery(params);
    return request<TonsByDay[]>(`/analytics/tons-by-day?${query}`);
  },
  getTonsByStation: (params?: DateRangeParams & { limit?: number }) => {
    const query = buildDateQuery(params);
    if (params?.limit) query.set('limit', params.limit.toString());
    return request<TonsByStation[]>(`/analytics/tons-by-station?${query}`);
  },
  getTopDrivers: (params?: DateRangeParams & { limit?: number }) => {
    const query = buildDateQuery(params);
    if (params?.limit) query.set('limit', params.limit.toString());
    return request<TopDriver[]>(`/analytics/top-drivers?${query}`);
  },
  getExceptions: (params?: DateRangeParams & { limit?: number }) => {
    const query = buildDateQuery(params);
    if (params?.limit) query.set('limit', params.limit.toString());
    return request<ExceptionTrip[]>(`/analytics/exceptions?${query}`);
  },
};

function buildDateQuery(params?: DateRangeParams): URLSearchParams {
  const query = new URLSearchParams();
  if (params?.from) query.set('from', params.from);
  if (params?.to) query.set('to', params.to);
  return query;
}

export interface DateRangeParams {
  from?: string;
  to?: string;
}

export interface OverviewData {
  totalTrips: number;
  approvedTrips: number;
  rejectedTrips: number;
  pendingTrips: number;
  draftTrips: number;
  totalTons: number;
  totalAmount: number;
  amountSource: 'salary_period' | 'estimated';
  activeDrivers: number;
  activeVehicles: number;
}

export interface TonsByDay {
  date: string;
  tons: number;
  trips: number;
}

export interface TonsByStation {
  stationId: string;
  stationName: string;
  stationType: string;
  tons: number;
  trips: number;
}

export interface TopDriver {
  driverId: string;
  employeeCode: string;
  driverName: string;
  trips: number;
  tons: number;
  avgTonsPerTrip: number;
}

export interface ExceptionTrip {
  tripId: string;
  tripCode: string;
  tripDate: string;
  driverName: string;
  vehiclePlate: string;
  routeName: string;
  originName: string;
  destinationName: string;
  rejectionReason: string;
  rejectedAt: string;
}

export { ApiError };
