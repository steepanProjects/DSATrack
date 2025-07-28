import { useState, useMemo, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronRight, Search, Bookmark, StickyNote } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { NotesModal } from "@/components/notes-modal";
import type { Problem } from "@shared/schema";

interface OptimizedCategoryProblemsProps {
  studentRegNo: string;
  problems: Problem[];
  progress: any[];
  bookmarks?: any[];
}

export function OptimizedCategoryProblems({ 
  studentRegNo, 
  problems, 
  progress, 
  bookmarks = [] 
}: OptimizedCategoryProblemsProps) {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [selectedProblem, setSelectedProblem] = useState<Problem | null>(null);
  
  // Batch update state for optimal performance
  const [pendingUpdates, setPendingUpdates] = useState<Map<number, string>>(new Map());

  // Create maps for O(1) lookups
  const progressMap = useMemo(() => {
    const map = new Map();
    progress.forEach(item => map.set(item.problem_id, item.status));
    return map;
  }, [progress]);

  const bookmarksSet = useMemo(() => {
    return new Set(bookmarks.map(b => b.problem_id));
  }, [bookmarks]);

  // Optimized progress mutation with batch processing
  const updateProgressMutation = useMutation({
    mutationFn: async ({ problemId, status }: { problemId: number; status: string }) => {
      // Update local state immediately
      setPendingUpdates(prev => new Map(prev).set(problemId, status));
      
      // Optimistic cache update
      queryClient.setQueryData(
        ["/api/student", studentRegNo, "progress"],
        (oldData: any) => {
          if (!oldData) return oldData;
          return oldData.map((item: any) => 
            item.problem_id === problemId ? { ...item, status } : item
          );
        }
      );
      
      // Update stats cache optimistically
      queryClient.setQueryData(
        ["/api/student", studentRegNo, "stats"],
        (oldStats: any) => {
          if (!oldStats) return oldStats;
          // Recalculate stats based on new status
          const newStats = { ...oldStats };
          const oldStatus = progressMap.get(problemId) || 'not_started';
          
          // Decrease old status count
          if (oldStatus !== 'not_started') newStats[oldStatus]--;
          // Increase new status count  
          if (status !== 'not_started') newStats[status]++;
          
          return newStats;
        }
      );

      // Server sync in background
      return apiRequest("PUT", `/api/student/${studentRegNo}/progress/${problemId}`, { status });
    },
    onError: () => {
      // Revert on error
      queryClient.invalidateQueries({ queryKey: ["/api/student", studentRegNo, "progress"] });
      queryClient.invalidateQueries({ queryKey: ["/api/student", studentRegNo, "stats"] });
    },
    onSettled: (_, __, { problemId }) => {
      // Remove from pending updates
      setPendingUpdates(prev => {
        const newMap = new Map(prev);
        newMap.delete(problemId);
        return newMap;
      });
    }
  });

  // Group problems by category with search filtering
  const categorizedProblems = useMemo(() => {
    const filtered = problems.filter(problem =>
      problem.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      problem.category.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const categories = new Map<string, { problems: Problem[]; step: number }>();
    
    filtered.forEach(problem => {
      const categoryKey = problem.category;
      if (!categories.has(categoryKey)) {
        categories.set(categoryKey, { problems: [], step: problem.id });
      }
      categories.get(categoryKey)!.problems.push(problem);
    });

    // Sort problems within each category by ID
    categories.forEach(category => {
      category.problems.sort((a, b) => a.id - b.id);
    });

    return Array.from(categories.entries()).sort((a, b) => a[1].step - b[1].step);
  }, [problems, searchTerm]);

  const handleStatusChange = useCallback((problemId: number, newStatus: string) => {
    updateProgressMutation.mutate({ problemId, status: newStatus });
  }, [updateProgressMutation]);

  const toggleCategory = useCallback((category: string) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(category)) {
        newSet.delete(category);
      } else {
        newSet.add(category);
      }
      return newSet;
    });
  }, []);

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
        <Input
          placeholder="Search problems..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Batch Update Indicator */}
      {pendingUpdates.size > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-orange-700">
              {pendingUpdates.size} update{pendingUpdates.size > 1 ? 's' : ''} syncing...
            </span>
            <div className="h-2 w-2 bg-orange-500 rounded-full animate-pulse"></div>
          </div>
        </div>
      )}

      {/* Categories */}
      {categorizedProblems.map(([category, { problems: categoryProblems, step }]) => {
        const isExpanded = expandedCategories.has(category);
        const completed = categoryProblems.filter(p => 
          progressMap.get(p.id) === 'completed' || pendingUpdates.get(p.id) === 'completed'
        ).length;
        const total = categoryProblems.length;
        const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

        return (
          <Card key={category} className="overflow-hidden">
            <Collapsible open={isExpanded} onOpenChange={() => toggleCategory(category)}>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-slate-50 pb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 text-slate-500" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-slate-500" />
                      )}
                      <div>
                        <div className="flex items-center space-x-2">
                          <Badge variant="secondary" className="text-xs">
                            Step {Math.floor(step / 25) + 1}
                          </Badge>
                          <CardTitle className="text-base font-semibold">{category}</CardTitle>
                        </div>
                        <p className="text-sm text-slate-600 mt-1">
                          {completed}/{total} completed ({percentage}%)
                        </p>
                      </div>
                    </div>
                    <div className="w-20">
                      <div className="w-full bg-slate-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all duration-300 ${
                            percentage < 50 ? 'bg-yellow-500' :
                            percentage < 100 ? 'bg-blue-500' : 'bg-green-500'
                          }`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              
              <CollapsibleContent>
                <CardContent className="pt-0 space-y-2">
                  {categoryProblems.map((problem, index) => {
                    const currentStatus = pendingUpdates.get(problem.id) || progressMap.get(problem.id) || 'not_started';
                    const isBookmarked = bookmarksSet.has(problem.id);
                    const isPending = pendingUpdates.has(problem.id);

                    return (
                      <div key={problem.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                        <div className="flex items-center space-x-3 flex-1">
                          <span className="text-sm font-medium text-slate-500 w-8">
                            #{index + 1}
                          </span>
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              checked={currentStatus === 'completed'}
                              onCheckedChange={(checked) => {
                                handleStatusChange(problem.id, checked ? 'completed' : 'not_started');
                              }}
                              disabled={isPending}
                              className={isPending ? 'opacity-50' : ''}
                            />
                            {isPending && (
                              <div className="h-2 w-2 bg-orange-500 rounded-full animate-pulse"></div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-slate-800 truncate">
                              {problem.title}
                            </h4>
                            <div className="flex items-center space-x-2 mt-1">
                              <Badge 
                                variant={
                                  problem.difficulty === 'Easy' ? 'secondary' :
                                  problem.difficulty === 'Medium' ? 'default' : 'destructive'
                                }
                                className="text-xs"
                              >
                                {problem.difficulty}
                              </Badge>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          {isBookmarked && (
                            <Bookmark className="h-4 w-4 text-blue-500 fill-current" />
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedProblem(problem)}
                            className="p-1"
                          >
                            <StickyNote className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
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
          isOpen={!!selectedProblem}
          onClose={() => setSelectedProblem(null)}
        />
      )}
    </div>
  );
}