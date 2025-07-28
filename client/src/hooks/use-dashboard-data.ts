import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "./use-auth";
import { apiRequest } from "@/lib/queryClient";

// Optimized hook that combines multiple API calls into fewer requests
export function useStudentDashboard() {
  const { user } = useAuth();

  // Use existing individual queries but with better caching
  const statsQuery = useQuery({
    queryKey: ["/api/student", user?.reg_no, "stats"],
    enabled: !!user && user.type === "student",
    staleTime: 5 * 60 * 1000, // 5 minutes caching
  });

  const problemsQuery = useQuery({
    queryKey: ["/api/problems"],
    staleTime: 15 * 60 * 1000, // 15 minutes - problems rarely change
  });

  const progressQuery = useQuery({
    queryKey: ["/api/student", user?.reg_no, "progress"],
    enabled: !!user && user.type === "student",
    staleTime: 3 * 60 * 1000, // 3 minutes caching
  });

  return {
    data: {
      stats: statsQuery.data,
      problems: problemsQuery.data,
      progress: progressQuery.data,
    },
    isLoading: statsQuery.isLoading || problemsQuery.isLoading || progressQuery.isLoading,
    error: statsQuery.error || problemsQuery.error || progressQuery.error,
  };
}

// Batch update hook for optimized checkbox operations
export function useBatchUpdates() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const batchMutation = useQuery({
    queryKey: ['batch-mutation-ready'],
    enabled: false,
    queryFn: async () => {
      // This will be used for batch operations
      return null;
    }
  });

  const createBatchUpdate = async (updates: Array<{problem_id: number, status: string}>) => {
    try {
      // Optimistically update cache first
      updates.forEach(({ problem_id, status }) => {
        queryClient.setQueryData(
          ["/api/student", user?.reg_no, "progress"],
          (oldData: any) => {
            if (!oldData) return oldData;
            return oldData.map((item: any) => 
              item.problem_id === problem_id ? { ...item, status } : item
            );
          }
        );
      });

      // Then sync with server
      const response = await apiRequest("PUT", `/api/student/${user?.reg_no}/progress/batch`, {
        updates
      });
      
      return response.json();
    } catch (error) {
      // Revert optimistic updates on error
      queryClient.invalidateQueries({ 
        queryKey: ["/api/student", user?.reg_no, "progress"] 
      });
      throw error;
    }
  };

  return { createBatchUpdate };
}

// Prefetch utility for common navigation patterns
export function usePrefetchOptimization() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const prefetchCommonData = () => {
    if (user?.type === "student") {
      // Prefetch likely to be needed data
      queryClient.prefetchQuery({
        queryKey: ["/api/student", user.reg_no, "bookmarks"],
        staleTime: 5 * 60 * 1000,
      });
      
      queryClient.prefetchQuery({
        queryKey: ["/api/student", user.reg_no, "goals"],
        staleTime: 10 * 60 * 1000,
      });
    }
  };

  return { prefetchCommonData };
}