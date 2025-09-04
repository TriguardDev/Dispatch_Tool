import { useState, useEffect, useCallback, useRef } from 'react';
import { type Booking } from '../api/crud';

interface UseSmartPollingOptions {
  fetchFunction: () => Promise<Booking[]>;
  pollingInterval?: number;
  onLogout: () => void;
  enabled?: boolean;
}

interface UseSmartPollingReturn {
  data: Booking[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  pausePolling: () => void;
  resumePolling: () => void;
  optimisticUpdate: (bookingId: number, updates: Partial<Booking>) => void;
}

export function useSmartPolling({
  fetchFunction,
  pollingInterval = 30000,
  onLogout,
  enabled = true
}: UseSmartPollingOptions): UseSmartPollingReturn {
  const [data, setData] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPaused, setIsPaused] = useState(false);

  const intervalRef = useRef<ReturnType<typeof setInterval>>(undefined);
  const fetchInProgressRef = useRef(false);
  const mountedRef = useRef(true);

  // Track user activity that should pause polling
  const pauseTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const fetchData = useCallback(async (showLoading = false) => {
    if (fetchInProgressRef.current || !enabled || !mountedRef.current) {
      console.log("Fetch skipped:", { 
        inProgress: fetchInProgressRef.current, 
        enabled, 
        mounted: mountedRef.current 
      });
      return;
    }

    try {
      fetchInProgressRef.current = true;
      console.log("Starting fetch, showLoading:", showLoading);
      if (showLoading) setLoading(true);
      setError(null);

      const result = await fetchFunction();
      console.log("Fetch completed, results:", result.length, "items");
      
      if (mountedRef.current) {
        setData(result);
      }
    } catch (err: unknown) {
      if (!mountedRef.current) return;
      
      console.error("Error fetching data:", err);
      const errorMessage = (err as Error).message || "Failed to fetch data";
      setError(errorMessage);
      
      // If authentication error, trigger logout
      if (errorMessage.includes("Authentication required")) {
        onLogout();
        return;
      }
    } finally {
      fetchInProgressRef.current = false;
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [fetchFunction, enabled, onLogout]);

  const resumePolling = useCallback(() => {
    setIsPaused(false);
    
    if (pauseTimeoutRef.current) {
      clearTimeout(pauseTimeoutRef.current);
      pauseTimeoutRef.current = undefined;
    }
    
    if (!intervalRef.current && enabled) {
      intervalRef.current = setInterval(() => {
        fetchData();
      }, pollingInterval);
    }
  }, [fetchData, pollingInterval, enabled]);

  const pausePolling = useCallback(() => {
    setIsPaused(true);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = undefined;
    }
    
    // Clear any existing pause timeout
    if (pauseTimeoutRef.current) {
      clearTimeout(pauseTimeoutRef.current);
    }
    
    // Auto-resume after 5 minutes to prevent indefinite pausing
    pauseTimeoutRef.current = setTimeout(() => {
      if (mountedRef.current) {
        resumePolling();
      }
    }, 300000); // 5 minutes
  }, [resumePolling]);

  const refetch = useCallback(async () => {
    await fetchData(true);
  }, [fetchData]);

  const optimisticUpdate = useCallback((bookingId: number, updates: Partial<Booking>) => {
    setData(prevData => 
      prevData.map(booking => 
        booking.bookingId === bookingId 
          ? { ...booking, ...updates }
          : booking
      )
    );
  }, []);

  // Initialize data fetching and set up polling interval
  useEffect(() => {
    if (!enabled) return;

    // Initial fetch
    console.log("Setting up polling with initial fetch");
    fetchData(true);

    if (isPaused) {
      console.log("Polling is paused, not setting up interval");
      return;
    }

    // Set up polling interval
    console.log("Setting up polling interval:", pollingInterval);
    intervalRef.current = setInterval(() => {
      console.log("Interval tick - fetching data");
      fetchData();
    }, pollingInterval);

    return () => {
      console.log("Cleaning up interval");
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = undefined;
      }
    };
  }, [pollingInterval, enabled, isPaused]); // Remove fetchData from deps to prevent continuous re-initialization

  // Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true;
    
    return () => {
      mountedRef.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (pauseTimeoutRef.current) {
        clearTimeout(pauseTimeoutRef.current);
      }
    };
  }, []);

  return {
    data,
    loading,
    error,
    refetch,
    pausePolling,
    resumePolling,
    optimisticUpdate
  };
}