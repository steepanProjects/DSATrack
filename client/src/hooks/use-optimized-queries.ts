import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useAuth } from "./use-auth";
import { apiRequest } from "@/lib/queryClient";

// Global cache configuration for different data types
const CACHE_TIMES = {
  STATIC_DATA: 15 * 60 * 1000,    // 15 minutes - rarely changing data
  USER_DATA: 5 * 60 * 1000,       // 5 minutes - user-specific data  
  PROGRESS_DATA: 3 * 60 * 1000,   // 3 minutes - frequently updated data
  REALTIME_DATA: 1 * 60 * 1000,   // 1 minute - real-time data
};

// Optimized queries with aggressive caching
export function useOptimizedProblems() {
  return useQuery({
    queryKey: ["/api/problems"],
    staleTime: CACHE_TIMES.STATIC_DATA,
    gcTime: CACHE_TIMES.STATIC_DATA * 2,
  });
}

export function useOptimizedStudentProgress(reg_no?: string) {
  return useQuery({
    queryKey: ["/api/student", reg_no, "progress"],
    enabled: !!reg_no,
    staleTime: CACHE_TIMES.PROGRESS_DATA,
    gcTime: CACHE_TIMES.PROGRESS_DATA * 2,
  });
}

export function useOptimizedStudentStats(reg_no?: string) {
  return useQuery({
    queryKey: ["/api/student", reg_no, "stats"],
    enabled: !!reg_no,
    staleTime: CACHE_TIMES.USER_DATA,
    gcTime: CACHE_TIMES.USER_DATA * 2,
  });
}

export function useOptimizedBookmarks(reg_no?: string) {
  return useQuery({
    queryKey: ["/api/student", reg_no, "bookmarks"],
    enabled: !!reg_no,
    staleTime: CACHE_TIMES.USER_DATA,
    gcTime: CACHE_TIMES.USER_DATA * 2,
  });
}

export function useOptimizedGoals(reg_no?: string) {
  return useQuery({
    queryKey: ["/api/student", reg_no, "goals"],
    enabled: !!reg_no,
    staleTime: CACHE_TIMES.USER_DATA,
    gcTime: CACHE_TIMES.USER_DATA * 2,
  });
}

// Optimistic mutation hooks
export function useOptimisticProgressUpdate(reg_no?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ problemId, status }: { problemId: number; status: string }) => {
      return apiRequest("PUT", `/api/student/${reg_no}/progress/${problemId}`, { status });
    },
    onMutate: async ({ problemId, status }) => {
      // Cancel outgoing queries
      await queryClient.cancelQueries({ queryKey: ["/api/student", reg_no, "progress"] });
      await queryClient.cancelQueries({ queryKey: ["/api/student", reg_no, "stats"] });

      // Snapshot previous values
      const previousProgress = queryClient.getQueryData(["/api/student", reg_no, "progress"]);
      const previousStats = queryClient.getQueryData(["/api/student", reg_no, "stats"]);

      // Optimistically update progress
      queryClient.setQueryData(["/api/student", reg_no, "progress"], (old: any) => {
        if (!old) return old;
        return old.map((item: any) => 
          item.problem_id === problemId ? { ...item, status } : item
        );
      });

      // Optimistically update stats
      queryClient.setQueryData(["/api/student", reg_no, "stats"], (old: any) => {
        if (!old) return old;
        
        const currentProgress = queryClient.getQueryData(["/api/student", reg_no, "progress"]) as any[];
        const currentItem = currentProgress?.find(p => p.problem_id === problemId);
        const oldStatus = currentItem?.status || 'not_started';
        
        const newStats = { ...old };
        
        // Adjust counts
        if (oldStatus !== 'not_started') {
          newStats[oldStatus] = Math.max(0, (newStats[oldStatus] || 0) - 1);
        }
        if (status !== 'not_started') {
          newStats[status] = (newStats[status] || 0) + 1;
        }
        
        return newStats;
      });

      return { previousProgress, previousStats };
    },
    onError: (err, variables, context) => {
      // Revert optimistic updates
      if (context?.previousProgress) {
        queryClient.setQueryData(["/api/student", reg_no, "progress"], context.previousProgress);
      }
      if (context?.previousStats) {
        queryClient.setQueryData(["/api/student", reg_no, "stats"], context.previousStats);
      }
    },
    onSettled: () => {
      // Refetch to ensure data consistency
      queryClient.invalidateQueries({ queryKey: ["/api/student", reg_no, "progress"] });
      queryClient.invalidateQueries({ queryKey: ["/api/student", reg_no, "stats"] });
    },
  });
}

// Batch operations for multiple updates
export function useBatchProgressUpdate(reg_no?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updates: Array<{ problem_id: number; status: string }>) => {
      return apiRequest("PUT", `/api/student/${reg_no}/progress/batch`, { updates });
    },
    onMutate: async (updates) => {
      await queryClient.cancelQueries({ queryKey: ["/api/student", reg_no, "progress"] });
      
      const previousProgress = queryClient.getQueryData(["/api/student", reg_no, "progress"]);
      
      // Apply all updates optimistically
      queryClient.setQueryData(["/api/student", reg_no, "progress"], (old: any) => {
        if (!old) return old;
        const updateMap = new Map(updates.map(u => [u.problem_id, u.status]));
        return old.map((item: any) => {
          const newStatus = updateMap.get(item.problem_id);
          return newStatus ? { ...item, status: newStatus } : item;
        });
      });

      return { previousProgress };
    },
    onError: (err, variables, context) => {
      if (context?.previousProgress) {
        queryClient.setQueryData(["/api/student", reg_no, "progress"], context.previousProgress);
      }
    },
    onSuccess: () => {
      // Refresh stats after batch update
      queryClient.invalidateQueries({ queryKey: ["/api/student", reg_no, "stats"] });
    },
  });
}

// Prefetch utility for better UX
export function usePrefetchStrategy() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const prefetchStudentData = () => {
    if (user?.type === "student" && user.reg_no) {
      // Prefetch likely needed data
      queryClient.prefetchQuery({
        queryKey: ["/api/student", user.reg_no, "bookmarks"],
        staleTime: CACHE_TIMES.USER_DATA,
      });
      
      queryClient.prefetchQuery({
        queryKey: ["/api/student", user.reg_no, "goals"],
        staleTime: CACHE_TIMES.USER_DATA,
      });
      
      queryClient.prefetchQuery({
        queryKey: ["/api/student", user.reg_no, "today-progress"],
        staleTime: CACHE_TIMES.REALTIME_DATA,
      });
    }
  };

  const prefetchAdminData = () => {
    if (user?.type === "admin") {
      queryClient.prefetchQuery({
        queryKey: ["/api/admin/analytics/difficulty-progress"],
        staleTime: CACHE_TIMES.USER_DATA,
      });
    }
  };

  return { prefetchStudentData, prefetchAdminData };
}

// Smart invalidation utilities
export function useSmartInvalidation() {
  const queryClient = useQueryClient();

  const invalidateUserData = (reg_no: string) => {
    queryClient.invalidateQueries({ queryKey: ["/api/student", reg_no] });
  };

  const invalidateAdminData = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/admin"] });
  };

  const invalidateGlobalData = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/problems"] });
  };

  return { invalidateUserData, invalidateAdminData, invalidateGlobalData };
}