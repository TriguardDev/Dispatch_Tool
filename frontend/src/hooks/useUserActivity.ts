import { useState, useCallback, useRef, useEffect } from 'react';

interface UseUserActivityReturn {
  isUserActive: boolean;
  startActivity: (activityId: string) => void;
  endActivity: (activityId: string) => void;
  clearAllActivities: () => void;
}

export function useUserActivity(): UseUserActivityReturn {
  const [activeActivities, setActiveActivities] = useState<Set<string>>(new Set());
  const activitiesRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    activitiesRef.current = activeActivities;
  }, [activeActivities]);

  const startActivity = useCallback((activityId: string) => {
    setActiveActivities(prev => {
      const newSet = new Set(prev);
      newSet.add(activityId);
      return newSet;
    });
  }, []);

  const endActivity = useCallback((activityId: string) => {
    setActiveActivities(prev => {
      const newSet = new Set(prev);
      newSet.delete(activityId);
      return newSet;
    });
  }, []);

  const clearAllActivities = useCallback(() => {
    setActiveActivities(new Set());
  }, []);

  return {
    isUserActive: activeActivities.size > 0,
    startActivity,
    endActivity,
    clearAllActivities
  };
}