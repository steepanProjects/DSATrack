import { useState, useMemo } from "react";
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

export function CategoryProblemsView({ studentRegNo }: CategoryProblemsViewProps) {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [selectedProblem, setSelectedProblem] = useState<Problem | null>(null);

  const { data: problems } = useQuery<Problem[]>({
    queryKey: ["/api/problems"],
  });

  const { data: progress } = useQuery<(StudentProgress & { problem: Problem })[]>({
    queryKey: ["/api/student", studentRegNo, "progress"],
  });

  const { data: bookmarks } = useQuery({
    queryKey: ["/api/student", studentRegNo, "bookmarks"],
  });

  const updateProgressMutation = useMutation({
    mutationFn: async ({ problemId, status }: { problemId: number; status: string }) => {
      const res = await apiRequest("PUT", `/api/student/${studentRegNo}/progress/${problemId}`, { status });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/student", studentRegNo] });
    },
  });

  const toggleBookmarkMutation = useMutation({
    mutationFn: async (problemId: number) => {
      const res = await apiRequest("POST", `/api/student/${studentRegNo}/bookmarks/${problemId}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/student", studentRegNo, "bookmarks"] });
    },
  });

  // Combine problems with progress data
  const problemsWithProgress: ProblemWithProgress[] = useMemo(() => {
    if (!problems || !progress || !bookmarks) return [];

    const progressMap = new Map();
    if (Array.isArray(progress)) {
      progress.forEach(p => {
        progressMap.set(p.problem_id, p.status);
      });
    }

    const bookmarkSet = new Set();
    if (Array.isArray(bookmarks)) {
      bookmarks.forEach((b: any) => bookmarkSet.add(b.problem_id));
    }

    return problems.map(problem => ({
      ...problem,
      status: progressMap.get(problem.id) || "not_started",
      isBookmarked: bookmarkSet.has(problem.id),
      hasNote: false // TODO: Add notes query
    }));
  }, [problems, progress, bookmarks]);

  // Group problems by category
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

    // Sort categories alphabetically and return as array
    return Array.from(categorized.entries()).sort(([a], [b]) => a.localeCompare(b));
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
    updateProgressMutation.mutate({ problemId, status: newStatus });
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
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
        <Input
          placeholder="Search problems..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Categories */}
      {problemsByCategory.map(([category, categoryProblems]) => {
        const stats = getCategoryStats(categoryProblems);
        const isExpanded = expandedCategories.has(category);

        return (
          <Card key={category} className="overflow-hidden">
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
                      <CardTitle className="text-lg">{category}</CardTitle>
                      <Badge variant="outline" className="text-sm">
                        {categoryProblems.length} problems
                      </Badge>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="text-sm text-slate-600">
                        {stats.completed}/{stats.total} completed ({stats.percentage}%)
                      </div>
                      <div className="w-24 bg-slate-200 rounded-full h-2">
                        <div
                          className="bg-green-500 h-2 rounded-full transition-all duration-300"
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
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-slate-50 transition-colors"
                      >
                        <div className="flex items-center space-x-4 flex-1">
                          <Checkbox
                            checked={problem.status === "completed"}
                            onCheckedChange={(checked) => 
                              handleStatusChange(problem.id, checked as boolean)
                            }
                            className="h-5 w-5"
                          />
                          <div className="flex-1">
                            <div className="flex items-center space-x-3">
                              <h4 className={`font-medium ${
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