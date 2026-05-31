// Interfaces que reflejan los serializers del backend Django.

export type SubscriptionStatus = 'trial' | 'active' | 'expired' | 'suspended' | 'none';
export type AppointmentStatus = 'pending' | 'in_progress' | 'done' | 'cancelled';
export type UserRole = 'admin' | 'employee' | 'superadmin';

export interface AuthUser {
  id: number;
  username: string;
  email?: string;
  full_name?: string;
  role: UserRole;
}

export interface BusinessBrief {
  id: number;
  name: string;
  subscription_status: SubscriptionStatus;
  is_subscription_active: boolean;
}

export interface Business {
  id: number;
  name: string;
  email: string;
  phone: string;
  address: string;
  owner_name: string;
  logo: string | null;
  created_at: string;
  is_active: boolean;
  subscription_status: SubscriptionStatus;
  is_subscription_active: boolean;
}

export interface Subscription {
  id: number;
  business: number;
  business_name: string;
  plan: string;
  status: SubscriptionStatus;
  status_display: string;
  start_date: string;
  end_date: string;
  price: string;
  auto_renew: boolean;
  notes: string;
  days_remaining: number;
  created_at: string;
  updated_at: string;
}

export interface LoginResponse {
  access: string;
  refresh: string;
  user: AuthUser;
  business: BusinessBrief;
}

export interface RegisterResponse {
  message: string;
  access: string;
  refresh: string;
  user: AuthUser;
  business: Business;
}

export interface Vehicle {
  id: number;
  client: number;
  brand: string;
  model: string;
  year: number | null;
  plate: string;
  color: string;
  notes: string;
}

export interface Client {
  id: number;
  business: number;
  first_name: string;
  last_name: string;
  full_name: string;
  email: string;
  phone: string;
  notes: string;
  is_active: boolean;
  created_at: string;
  vehicles: Vehicle[];
}

export interface Employee {
  id: number;
  business: number;
  first_name: string;
  last_name: string;
  full_name: string;
  phone: string;
  email: string;
  is_active: boolean;
  hire_date: string | null;
}

export interface WashService {
  id: number;
  business: number;
  name: string;
  description: string;
  price: string;
  duration_minutes: number;
  is_active: boolean;
}

export interface Appointment {
  id: number;
  business: number;
  vehicle: number;
  vehicle_detail?: Vehicle;
  employee: number | null;
  employee_detail?: Employee;
  services: number[];
  services_detail?: WashService[];
  scheduled_at: string;
  status: AppointmentStatus;
  status_display: string;
  notes: string;
  total_price: string;
  client_name?: string;
  created_at: string;
  updated_at: string;
}

export interface DashboardStats {
  total_clients: number;
  total_vehicles: number;
  total_employees: number;
  appointments_today: number;
  appointments_pending: number;
  appointments_done_this_month: number;
  revenue_this_month: string;
}

// El backend usa PageNumberPagination (PAGE_SIZE = 20).
export interface Paginated<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}
