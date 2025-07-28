import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronRight, Search, Bookmark, StickyNote } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { NotesModal } from "@/components/notes-modal";
import type { Problem, StudentProgress } from "@shared/schema";

interface ProblemWithProgress extends Problem {
  status?: string;
  isBookmarked?: boolean;
  hasNote?: boolean;
}

interface CategoryProblemsViewProps {
  studentRegNo: string;
}

// Batching configuration
const BATCH_DELAY = 2000; // 2 seconds
const MAX_BATCH_SIZE = 10; // Maximum updates in one batch

interface QueuedUpdate {
  problemId: number;
  status: string;
  timestamp: number;
}

export function CategoryProblemsView({ studentRegNo }: CategoryProblemsViewProps) {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [selectedProblem, setSelectedProblem] = useState<Problem | null>(null);
  
  // Batching state
  const [updateQueue, setUpdateQueue] = useState<QueuedUpdate[]>([]);
  const [isProcessingBatch, setIsProcessingBatch] = useState(false);
  const batchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const { data: problems } = useQuery<Problem[]>({
    queryKey: ["/api/problems"],
  });

  const { data: progress } = useQuery<(StudentProgress & { problem: Problem })[]>({
    queryKey: ["/api/student", studentRegNo, "progress"],
  });

  const { data: bookmarks } = useQuery({
    queryKey: ["/api/student", studentRegNo, "bookmarks"],
  });

  // Batch processing function
  const processBatch = useCallback(async (updates: QueuedUpdate[]) => {
    if (updates.length === 0) return;
    
    setIsProcessingBatch(true);
    try {
      // Process all updates in the batch
      await Promise.all(
        updates.map(async (update) => {
          const res = await apiRequest("PUT", `/api/student/${studentRegNo}/progress/${update.problemId}`, { 
            status: update.status 
          });
          return res.json();
        })
      );
      
      // Clear processed updates from queue
      setUpdateQueue(prev => prev.filter(item => 
        !updates.some(update => update.problemId === item.problemId)
      ));
      
      // Refresh data from server
      queryClient.invalidateQueries({ queryKey: ["/api/student", studentRegNo, "progress"] });
      queryClient.invalidateQueries({ queryKey: ["/api/student", studentRegNo, "stats"] });
      
    } catch (error) {
      console.error("Batch update failed:", error);
      // Keep failed updates in queue for retry
    } finally {
      setIsProcessingBatch(false);
    }
  }, [studentRegNo, queryClient]);

  // Auto-batch processing effect
  useEffect(() => {
    if (updateQueue.length === 0) return;
    
    // Clear existing timeout
    if (batchTimeoutRef.current) {
      clearTimeout(batchTimeoutRef.current);
    }
    
    // Process immediately if batch is full
    if (updateQueue.length >= MAX_BATCH_SIZE) {
      processBatch(updateQueue);
      return;
    }
    
    // Otherwise, set a timeout to process after delay
    batchTimeoutRef.current = setTimeout(() => {
      processBatch(updateQueue);
    }, BATCH_DELAY);
    
    return () => {
      if (batchTimeoutRef.current) {
        clearTimeout(batchTimeoutRef.current);
      }
    };
  }, [updateQueue, processBatch]);

  // Immediate UI update function
  const updateProgressInstantly = useCallback((problemId: number, status: string) => {
    // Immediately update UI cache - the server returns problems with id field, not problem_id
    queryClient.setQueryData(["/api/student", studentRegNo, "progress"], (old: any) => {
      if (!Array.isArray(old)) return [];
      
      const existingIndex = old.findIndex((p: any) => p.id === problemId);
      if (existingIndex >= 0) {
        const updated = [...old];
        updated[existingIndex] = { ...updated[existingIndex], status };
        return updated;
      }
      // If not found, the status will be handled by server refresh
      return old;
    });

    // Update stats immediately
    queryClient.setQueryData(["/api/student", studentRegNo, "stats"], (old: any) => {
      if (!old) return old;
      
      const currentProgress = queryClient.getQueryData(["/api/student", studentRegNo, "progress"]) as any[];
      if (!Array.isArray(currentProgress)) return old;
      
      const completed = currentProgress.filter((p: any) => p.status === "completed").length;
      const inProgress = currentProgress.filter((p: any) => p.status === "in_progress").length;
      const total = old.total || 0;
      const notStarted = total - completed - inProgress;
      
      return {
        ...old,
        completed,
        in_progress: inProgress,
        not_started: notStarted
      };
    });
    
    // Add to batch queue
    setUpdateQueue(prev => {
      // Remove any existing update for this problem
      const filtered = prev.filter(item => item.problemId !== problemId);
      // Add new update
      return [...filtered, { problemId, status, timestamp: Date.now() }];
    });
  }, [studentRegNo, queryClient]);

  // Get current status for a problem (with pending updates considered)
  const getCurrentStatus = useCallback((problemId: number) => {
    // Check if there's a pending update for this problem
    const pendingUpdate = updateQueue.find(u => u.problemId === problemId);
    if (pendingUpdate) {
      return pendingUpdate.status;
    }
    
    // Otherwise get from current progress data - server returns problems with id field, not problem_id
    const problemProgress = progress?.find((p: any) => p.id === problemId);
    return problemProgress?.status || "not_started";
  }, [progress, updateQueue]);

  const toggleBookmarkMutation = useMutation({
    mutationFn: async (problemId: number) => {
      const res = await apiRequest("POST", `/api/student/${studentRegNo}/bookmarks/${problemId}`);
      return res.json();
    },
    onMutate: async (problemId) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["/api/student", studentRegNo, "bookmarks"] });

      // Snapshot the previous value
      const previousBookmarks = queryClient.getQueryData(["/api/student", studentRegNo, "bookmarks"]);

      // Optimistically update bookmarks
      queryClient.setQueryData(["/api/student", studentRegNo, "bookmarks"], (old: any) => {
        if (!Array.isArray(old)) return [];
        
        const existingIndex = old.findIndex((b: any) => b.problem_id === problemId);
        if (existingIndex >= 0) {
          // Remove bookmark
          return old.filter((b: any) => b.problem_id !== problemId);
        } else {
          // Add bookmark
          return [...old, { id: Date.now(), reg_no: studentRegNo, problem_id: problemId }];
        }
      });

      return { previousBookmarks };
    },
    onError: (err, variables, context) => {
      if (context?.previousBookmarks) {
        queryClient.setQueryData(["/api/student", studentRegNo, "bookmarks"], context.previousBookmarks);
      }
    },
    onSettled: () => {
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["/api/student", studentRegNo, "bookmarks"] });
      }, 300);
    },
  });

  // Combine problems with progress data
  const problemsWithProgress: ProblemWithProgress[] = useMemo(() => {
    if (!problems || !progress || !bookmarks) return [];

    const bookmarkSet = new Set();
    if (Array.isArray(bookmarks)) {
      bookmarks.forEach((b: any) => bookmarkSet.add(b.problem_id));
    }

    return problems.map(problem => ({
      ...problem,
      status: getCurrentStatus(problem.id),
      isBookmarked: bookmarkSet.has(problem.id),
      hasNote: false // TODO: Add notes query
    }));
  }, [problems, progress, bookmarks, updateQueue, getCurrentStatus]);

  // Define the proper DSA learning path order
  const categoryOrder = [
    "STEP 1: LEARN THE BASICS",
    "STEP 2: LEARN IMPORTANT SORTING TECHNIQUES", 
    "STEP 3: SOLVE PROBLEMS ON ARRAYS [Easy -> Medium -> Hard]",
    "STEP 4: BINARY SEARCH [1D, 2D Arrays, Search Space]",
    "STEP 5: STRINGS [Basic and Medium]",
    "STEP 6: LEARN LINKEDLIST [Single LL, Double LL, Medium, Hard Problems]",
    "STEP 7: RECURSION [PatternWise]",
    "STEP 8: BIT MANIPULATION [Concepts & Problems]",
    "STEP 9: STACK AND QUEUES [Learning, Pre-In-Post-fix, Monotonic Stack, Implementation]",
    "STEP 10: SLIDING WINDOW & TWO POINTER COMBINED PROBLEMS",
    "STEP 11: HEAPS [Learning, Medium, Hard Problems]",
    "STEP 12: GREEDY ALGORITHMS [Easy, Medium/Hard]",
    "STEP 13: BINARY TREES [Traversals, Medium and Hard Problems]",
    "STEP 14: BINARY SEARCH TREES [Concept and Problems]",
    "STEP 15: GRAPHS [BFS, DFS, Topo sort, MST]",
    "STEP 16: DYNAMIC PROGRAMMING [Patterns and Problems]",
    "STEP 17: TRIES",
    "STEP 18: STRINGS [Advanced]"
  ];

  // Group problems by category and sort them
  const problemsByCategory = useMemo(() => {
    const filtered = problemsWithProgress.filter(problem => 
      problem.title.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const categorized = new Map<string, ProblemWithProgress[]>();
    filtered.forEach(problem => {
      if (!categorized.has(problem.category)) {
        categorized.set(problem.category, []);
      }
      categorized.get(problem.category)!.push(problem);
    });

    // Sort problems within each category by their ID (which represents the learning order)
    categorized.forEach((problems) => {
      problems.sort((a, b) => a.id - b.id);
    });

    // Return categories in the proper DSA learning order
    const orderedCategories: [string, ProblemWithProgress[]][] = [];
    
    categoryOrder.forEach(categoryName => {
      if (categorized.has(categoryName)) {
        orderedCategories.push([categoryName, categorized.get(categoryName)!]);
      }
    });

    // Add any remaining categories that weren't in our predefined order
    categorized.forEach((problems, categoryName) => {
      if (!categoryOrder.includes(categoryName)) {
        orderedCategories.push([categoryName, problems]);
      }
    });

    return orderedCategories;
  }, [problemsWithProgress, searchTerm]);

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(category)) {
        newSet.delete(category);
      } else {
        newSet.add(category);
      }
      return newSet;
    });
  };

  const handleStatusChange = (problemId: number, completed: boolean) => {
    const newStatus = completed ? "completed" : "not_started";
    updateProgressInstantly(problemId, newStatus);
  };

  const getDifficultyBadge = (difficulty: string) => {
    switch (difficulty) {
      case "Easy":
        return <Badge className="bg-green-100 text-green-800 text-xs">Easy</Badge>;
      case "Medium":
        return <Badge className="bg-yellow-100 text-yellow-800 text-xs">Medium</Badge>;
      case "Hard":
        return <Badge className="bg-red-100 text-red-800 text-xs">Hard</Badge>;
      default:
        return <Badge variant="outline" className="text-xs">{difficulty}</Badge>;
    }
  };

  const getCategoryStats = (problems: ProblemWithProgress[]) => {
    const completed = problems.filter(p => p.status === "completed").length;
    const total = problems.length;
    return { completed, total, percentage: total > 0 ? Math.round((completed / total) * 100) : 0 };
  };

  if (!problems || !progress || !bookmarks) {
    return <div className="flex items-center justify-center p-8">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Search and Batch Status */}
      <div className="flex items-center space-x-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search problems..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        {updateQueue.length > 0 && (
          <div className="flex items-center space-x-2 text-sm text-orange-600 bg-orange-50 px-3 py-2 rounded-lg border border-orange-200">
            <div className="h-2 w-2 bg-orange-500 rounded-full animate-pulse" />
            <span>{updateQueue.length} pending update{updateQueue.length !== 1 ? 's' : ''}</span>
            {isProcessingBatch && <span className="text-blue-600">(syncing...)</span>}
          </div>
        )}
      </div>

      {/* Categories */}
      {problemsByCategory.map(([category, categoryProblems]) => {
        const stats = getCategoryStats(categoryProblems);
        const isExpanded = expandedCategories.has(category);

        const stepNumber = category.match(/STEP (\d+)/)?.[1] || "";
        const categoryTitle = category.replace(/STEP \d+: /, "");

        return (
          <Card key={category} className="overflow-hidden border-l-4 border-l-blue-500">
            <Collapsible open={isExpanded} onOpenChange={() => toggleCategory(category)}>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-slate-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      {isExpanded ? (
                        <ChevronDown className="h-5 w-5 text-slate-500" />
                      ) : (
                        <ChevronRight className="h-5 w-5 text-slate-500" />
                      )}
                      <div className="flex items-center space-x-3">
                        {stepNumber && (
                          <div className="bg-blue-500 text-white px-3 py-1 rounded-full text-sm font-bold">
                            Step {stepNumber}
                          </div>
                        )}
                        <CardTitle className="text-lg">{categoryTitle}</CardTitle>
                      </div>
                      <Badge variant="outline" className="text-sm ml-auto">
                        {categoryProblems.length} problems
                      </Badge>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="text-sm text-slate-600 font-medium">
                        {stats.completed}/{stats.total} completed ({stats.percentage}%)
                      </div>
                      <div className="w-32 bg-slate-200 rounded-full h-3">
                        <div
                          className={`h-3 rounded-full transition-all duration-300 ${
                            stats.percentage === 100 
                              ? "bg-green-500" 
                              : stats.percentage > 50 
                                ? "bg-blue-500" 
                                : "bg-yellow-500"
                          }`}
                          style={{ width: `${stats.percentage}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              
              <CollapsibleContent>
                <CardContent className="pt-0">
                  <div className="space-y-3">
                    {categoryProblems.map((problem) => (
                      <div
                        key={problem.id}
                        className={`flex items-center justify-between p-4 border rounded-lg transition-all duration-200 ${
                          problem.status === "completed" 
                            ? "bg-green-50 border-green-200" 
                            : "hover:bg-slate-50 border-slate-200"
                        }`}
                      >
                        <div className="flex items-center space-x-4 flex-1">
                          <div className="flex items-center space-x-3">
                            <span className="text-sm font-mono text-slate-500 w-8">
                              #{problem.id}
                            </span>
                            <div className="relative">
                              <Checkbox
                                checked={problem.status === "completed"}
                                onCheckedChange={(checked) => 
                                  handleStatusChange(problem.id, checked as boolean)
                                }
                                disabled={isProcessingBatch}
                                className="h-5 w-5"
                              />
                              {updateQueue.some(u => u.problemId === problem.id) && (
                                <div className="absolute -top-1 -right-1 h-2 w-2 bg-orange-500 rounded-full animate-pulse" 
                                     title="Pending sync to server" />
                              )}
                            </div>
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center space-x-3">
                              <h4 className={`font-medium transition-all ${
                                problem.status === "completed" 
                                  ? "line-through text-slate-500" 
                                  : "text-slate-900"
                              }`}>
                                {problem.title}
                              </h4>
                              {getDifficultyBadge(problem.difficulty)}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleBookmarkMutation.mutate(problem.id)}
                            disabled={isProcessingBatch}
                            className={problem.isBookmarked ? "text-yellow-600" : "text-slate-400"}
                          >
                            <Bookmark className="h-4 w-4" fill={problem.isBookmarked ? "currentColor" : "none"} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedProblem(problem)}
                          >
                            <StickyNote className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </Card>
        );
      })}

      {/* Notes Modal */}
      {selectedProblem && (
        <NotesModal
          problem={selectedProblem}
          studentRegNo={studentRegNo}
          onClose={() => setSelectedProblem(null)}
        />
      )}
    </div>
  );
}