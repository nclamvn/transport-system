'use client';

import { User } from './api';

const TOKEN_KEY = 'token';
const USER_KEY = 'user';

export function setAuth(token: string, user: User) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function getUser(): User | null {
  if (typeof window === 'undefined') return null;
  const data = localStorage.getItem(USER_KEY);
  return data ? JSON.parse(data) : null;
}

export function clearAuth() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function isAuthenticated(): boolean {
  return !!getToken();
}

export function isDriver(): boolean {
  const user = getUser();
  return user?.roles?.includes('DRIVER') ?? false;
}

export function isReviewer(): boolean {
  const user = getUser();
  if (!user?.roles) return false;
  return (
    user.roles.includes('ADMIN') ||
    user.roles.includes('DISPATCHER') ||
    user.roles.includes('HR')
  );
}

export function isAdmin(): boolean {
  const user = getUser();
  return user?.roles?.includes('ADMIN') ?? false;
}

export function hasRole(role: string): boolean {
  const user = getUser();
  return user?.roles?.includes(role) ?? false;
}

export function isHR(): boolean {
  const user = getUser();
  if (!user?.roles) return false;
  return user.roles.includes('ADMIN') || user.roles.includes('HR');
}
