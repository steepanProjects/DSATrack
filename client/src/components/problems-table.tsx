import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Search, Bookmark, StickyNote, ExternalLink } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { NotesModal } from "@/components/notes-modal";
import type { Problem, StudentProgress } from "@shared/schema";

interface ProblemWithProgress extends Problem {
  status?: string;
  isBookmarked?: boolean;
  hasNote?: boolean;
}

interface ProblemsTableProps {
  studentRegNo: string;
}

export function ProblemsTable({ studentRegNo }: ProblemsTableProps) {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [difficultyFilter, setDifficultyFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedProblem, setSelectedProblem] = useState<Problem | null>(null);
  const itemsPerPage = 10;

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
    progress.forEach(p => {
      progressMap.set(p.problem_id, p.status);
    });

    const bookmarkSet = new Set(bookmarks.map((b: any) => b.problem_id));

    return problems.map(problem => ({
      ...problem,
      status: progressMap.get(problem.id) || "not_started",
      isBookmarked: bookmarkSet.has(problem.id),
      hasNote: false // TODO: Add notes query
    }));
  }, [problems, progress, bookmarks]);

  // Filter and paginate problems
  const filteredProblems = useMemo(() => {
    return problemsWithProgress.filter(problem => {
      const matchesSearch = problem.title.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = categoryFilter === "all" || problem.category === categoryFilter;
      const matchesDifficulty = difficultyFilter === "all" || problem.difficulty === difficultyFilter;
      return matchesSearch && matchesCategory && matchesDifficulty;
    });
  }, [problemsWithProgress, searchTerm, categoryFilter, difficultyFilter]);

  const paginatedProblems = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredProblems.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredProblems, currentPage]);

  const totalPages = Math.ceil(filteredProblems.length / itemsPerPage);

  // Get unique categories for filter
  const categories = useMemo(() => {
    const cats = new Set(problems?.map(p => p.category) || []);
    return Array.from(cats);
  }, [problems]);

  const getDifficultyBadge = (difficulty: string) => {
    switch (difficulty) {
      case "Easy":
        return <Badge className="bg-secondary/10 text-secondary">Easy</Badge>;
      case "Medium":
        return <Badge className="bg-accent/10 text-accent">Medium</Badge>;
      case "Hard":
        return <Badge className="bg-danger/10 text-danger">Hard</Badge>;
      default:
        return <Badge variant="outline">{difficulty}</Badge>;
    }
  };

  if (!problems || !progress || !bookmarks) {
    return <div className="flex items-center justify-center p-8">Loading...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search problems..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 w-full sm:w-64"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map(category => (
              <SelectItem key={category} value={category}>{category}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="All Difficulties" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Difficulties</SelectItem>
            <SelectItem value="Easy">Easy</SelectItem>
            <SelectItem value="Medium">Medium</SelectItem>
            <SelectItem value="Hard">Hard</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left px-6 py-4 text-sm font-medium text-slate-600">Problem</th>
              <th className="text-left px-6 py-4 text-sm font-medium text-slate-600">Category</th>
              <th className="text-left px-6 py-4 text-sm font-medium text-slate-600">Difficulty</th>
              <th className="text-left px-6 py-4 text-sm font-medium text-slate-600">Status</th>
              <th className="text-left px-6 py-4 text-sm font-medium text-slate-600">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {paginatedProblems.map((problem) => (
              <tr key={problem.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center space-x-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleBookmarkMutation.mutate(problem.id)}
                      className={problem.isBookmarked ? "text-accent" : "text-slate-400"}
                    >
                      <Bookmark className={`h-4 w-4 ${problem.isBookmarked ? "fill-current" : ""}`} />
                    </Button>
                    <div>
                      <p className="text-sm font-medium text-slate-800">{problem.title}</p>
                      <p className="text-xs text-slate-500">Problem #{problem.id}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <Badge className="bg-primary/10 text-primary">{problem.category}</Badge>
                </td>
                <td className="px-6 py-4">
                  {getDifficultyBadge(problem.difficulty)}
                </td>
                <td className="px-6 py-4">
                  <Select
                    value={problem.status}
                    onValueChange={(status) => updateProgressMutation.mutate({ problemId: problem.id, status })}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="not_started">Not Started</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedProblem(problem)}
                      className={problem.hasNote ? "text-primary" : "text-slate-400"}
                    >
                      <StickyNote className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" className="text-slate-400">
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-600">
          Showing {(currentPage - 1) * itemsPerPage + 1}-{Math.min(currentPage * itemsPerPage, filteredProblems.length)} of {filteredProblems.length} problems
        </p>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
          >
            Previous
          </Button>
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            const page = i + 1;
            return (
              <Button
                key={page}
                variant={currentPage === page ? "default" : "outline"}
                size="sm"
                onClick={() => setCurrentPage(page)}
              >
                {page}
              </Button>
            );
          })}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
          >
            Next
          </Button>
        </div>
      </div>

      {/* Notes Modal */}
      {selectedProblem && (
        <NotesModal
          problem={selectedProblem}
          onClose={() => setSelectedProblem(null)}
          studentRegNo={studentRegNo}
        />
      )}
    </div>
  );
}
