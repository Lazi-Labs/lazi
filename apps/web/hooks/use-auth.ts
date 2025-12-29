'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/auth-store';
import { authApi, AuthUser } from '@/lib/api';

interface LoginCredentials {
  email: string;
  password: string;
}

export function useAuth() {
  const router = useRouter();
  const { user, token, isAuthenticated, isLoading, setAuth, clearAuth, setLoading } = useAuthStore();

  // Check current user on mount
  const { data: currentUser, isLoading: isCheckingAuth } = useQuery({
    queryKey: ['me'],
    queryFn: () => authApi.getMe(),
    enabled: !!token && !user,
    retry: false,
  });

  useEffect(() => {
    if (currentUser) {
      setAuth(currentUser, token!);
    }
  }, [currentUser, token, setAuth]);

  useEffect(() => {
    if (!isCheckingAuth) {
      setLoading(false);
    }
  }, [isCheckingAuth, setLoading]);

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: (credentials: LoginCredentials) =>
      authApi.login(credentials.email, credentials.password),
    onSuccess: (data) => {
      // Store access token
      localStorage.setItem('accessToken', data.accessToken);
      setAuth(data.user, data.accessToken);
      router.push('/dashboard');
    },
  });

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: () => authApi.logout(),
    onSuccess: () => {
      localStorage.removeItem('accessToken');
      clearAuth();
      router.push('/login');
    },
    onError: () => {
      // Clear auth even if logout fails
      localStorage.removeItem('accessToken');
      clearAuth();
      router.push('/login');
    },
  });

  return {
    user,
    token,
    isAuthenticated,
    isLoading: isLoading || isCheckingAuth,
    login: loginMutation.mutate,
    logout: logoutMutation.mutate,
    loginError: loginMutation.error,
    isLoggingIn: loginMutation.isPending,
  };
}
