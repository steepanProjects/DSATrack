import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Target, Users, TrendingUp, Calendar, AlertCircle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { AdminGoal } from "@shared/schema";

interface AdminGoalFormData {
  title: string;
  description: string;
  type: string;
  target: number;
  category?: string | null;
  difficulty?: string | null;
  deadline?: string | null;
  assign_to_all: boolean;
}

export function AdminGoalManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedGoalId, setSelectedGoalId] = useState<number | null>(null);

  // Fetch admin goals
  const { data: adminGoals = [], isLoading } = useQuery<AdminGoal[]>({
    queryKey: ["/api/admin/goals"],
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Fetch analytics for selected goal
  const { data: analytics } = useQuery<{
    totalStudents: number;
    completedStudents: number;
    averageProgress: number;
    progressDistribution: Array<{
      student_name: string;
      reg_no: string;
      current_progress: number;
      is_completed: boolean;
    }>;
  }>({
    queryKey: ["/api/admin/goals", selectedGoalId, "analytics"],
    enabled: !!selectedGoalId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  // Create goal mutation
  const createGoalMutation = useMutation({
    mutationFn: (goalData: AdminGoalFormData) => 
      apiRequest("POST", "/api/admin/goals", goalData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/goals"] });
      setIsCreateDialogOpen(false);
      toast({
        title: "Success",
        description: "Goal created and assigned successfully!",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create goal. Please try again.",
        variant: "destructive",
      });
    },
  });

  const CreateGoalDialog = () => {
    const [formData, setFormData] = useState<AdminGoalFormData>({
      title: "",
      description: "",
      type: "weekly",
      target: 10,
      category: "",
      difficulty: "",
      deadline: "",
      assign_to_all: true,
    });

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      
      const submitData = {
        ...formData,
        deadline: formData.deadline ? new Date(formData.deadline).toISOString() : null,
        category: formData.category === "any" ? null : formData.category || null,
        difficulty: formData.difficulty === "any" ? null : formData.difficulty || null,
      };
      
      createGoalMutation.mutate(submitData);
    };

    return (
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogTrigger asChild>
          <Button className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Create Goal for All Students
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create Goal for All Students</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="title">Goal Title</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., Complete 10 Array problems"
                required
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe the goal and its benefits..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="type">Goal Type</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) => setFormData({ ...formData, type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="target">Target Count</Label>
                <Input
                  id="target"
                  type="number"
                  min="1"
                  value={formData.target}
                  onChange={(e) => setFormData({ ...formData, target: parseInt(e.target.value) })}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="category">Category (Optional)</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData({ ...formData, category: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Any category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Any Category</SelectItem>
                    <SelectItem value="Arrays">Arrays</SelectItem>
                    <SelectItem value="Strings">Strings</SelectItem>
                    <SelectItem value="Linked Lists">Linked Lists</SelectItem>
                    <SelectItem value="Trees">Trees</SelectItem>
                    <SelectItem value="Dynamic Programming">Dynamic Programming</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="difficulty">Difficulty (Optional)</Label>
                <Select
                  value={formData.difficulty}
                  onValueChange={(value) => setFormData({ ...formData, difficulty: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Any difficulty" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Any Difficulty</SelectItem>
                    <SelectItem value="Easy">Easy</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="Hard">Hard</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="deadline">Deadline (Optional)</Label>
              <Input
                id="deadline"
                type="date"
                value={formData.deadline}
                onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setIsCreateDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={createGoalMutation.isPending}
              >
                {createGoalMutation.isPending ? "Creating..." : "Create & Assign to All"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    );
  };

  const GoalAnalyticsCard = ({ goal }: { goal: AdminGoal }) => {
    const goalAnalytics = selectedGoalId === goal.id ? analytics : null;
    
    return (
      <Card className="cursor-pointer hover:bg-slate-50" onClick={() => setSelectedGoalId(goal.id)}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              {goal.title}
            </CardTitle>
            <Badge variant="outline" className="text-xs">
              {goal.type}
            </Badge>
          </div>
          {goal.description && (
            <p className="text-sm text-slate-600">{goal.description}</p>
          )}
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-1">
                <Target className="h-4 w-4" />
                Target: {goal.target} problems
              </span>
              {goal.deadline && (
                <span className="flex items-center gap-1 text-orange-600">
                  <Calendar className="h-4 w-4" />
                  {new Date(goal.deadline).toLocaleDateString()}
                </span>
              )}
            </div>

            {goal.category && (
              <Badge variant="secondary" className="text-xs">
                {goal.category}
              </Badge>
            )}

            {goal.difficulty && (
              <Badge 
                variant={
                  goal.difficulty === 'Easy' ? 'secondary' :
                  goal.difficulty === 'Medium' ? 'default' : 'destructive'
                }
                className="text-xs ml-2"
              >
                {goal.difficulty}
              </Badge>
            )}

            {goalAnalytics && typeof goalAnalytics === 'object' && 'totalStudents' in goalAnalytics && (
              <div className="mt-4 space-y-3 border-t pt-3">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-lg font-bold text-blue-600">
                      {goalAnalytics.totalStudents}
                    </div>
                    <div className="text-xs text-slate-600">Total Students</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-green-600">
                      {goalAnalytics.completedStudents}
                    </div>
                    <div className="text-xs text-slate-600">Completed</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-orange-600">
                      {goalAnalytics.averageProgress}%
                    </div>
                    <div className="text-xs text-slate-600">Avg Progress</div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Overall Progress</span>
                    <span>{Math.round((goalAnalytics.completedStudents / goalAnalytics.totalStudents) * 100)}%</span>
                  </div>
                  <Progress 
                    value={(goalAnalytics.completedStudents / goalAnalytics.totalStudents) * 100} 
                    className="h-2"
                  />
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  const DetailedAnalytics = () => {
    if (!selectedGoalId || !analytics || !Array.isArray(adminGoals)) return null;

    const selectedGoal = adminGoals.find((g: AdminGoal) => g.id === selectedGoalId);
    if (!selectedGoal) return null;

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Detailed Analytics: {selectedGoal.title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Summary Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  {analytics.totalStudents}
                </div>
                <div className="text-sm text-blue-700">Total Students</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {analytics.completedStudents}
                </div>
                <div className="text-sm text-green-700">Completed</div>
              </div>
              <div className="text-center p-4 bg-orange-50 rounded-lg">
                <div className="text-2xl font-bold text-orange-600">
                  {analytics.averageProgress}%
                </div>
                <div className="text-sm text-orange-700">Average Progress</div>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">
                  {analytics.totalStudents - analytics.completedStudents}
                </div>
                <div className="text-sm text-purple-700">In Progress</div>
              </div>
            </div>

            {/* Progress Distribution */}
            <div>
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <Users className="h-4 w-4" />
                Student Progress Distribution
              </h4>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {analytics.progressDistribution?.map((student: any, index: number) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-slate-50 rounded">
                    <div className="flex-1">
                      <div className="font-medium text-sm">{student.student_name}</div>
                      <div className="text-xs text-slate-600">{student.reg_no}</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Progress value={student.current_progress} className="w-24 h-2" />
                      <div className="text-sm font-medium w-12 text-right">
                        {student.current_progress}%
                      </div>
                      {student.is_completed && (
                        <Badge variant="default" className="text-xs">
                          ✓ Done
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (isLoading) {
    return <div className="p-6">Loading admin goals...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Goal Management</h2>
          <p className="text-slate-600">Set and track goals for all students with one click</p>
        </div>
        <CreateGoalDialog />
      </div>

      <Tabs defaultValue="goals" className="space-y-4">
        <TabsList>
          <TabsTrigger value="goals">Active Goals</TabsTrigger>
          <TabsTrigger value="analytics">Detailed Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="goals" className="space-y-4">
          {adminGoals.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <AlertCircle className="h-8 w-8 mx-auto mb-4 text-slate-400" />
                <h3 className="font-semibold mb-2">No Goals Created Yet</h3>
                <p className="text-slate-600 mb-4">
                  Create your first goal to assign to all students and track their progress.
                </p>
                <CreateGoalDialog />
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {adminGoals.map((goal: AdminGoal) => (
                <GoalAnalyticsCard key={goal.id} goal={goal} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="analytics">
          {selectedGoalId ? (
            <DetailedAnalytics />
          ) : (
            <Card>
              <CardContent className="p-6 text-center">
                <TrendingUp className="h-8 w-8 mx-auto mb-4 text-slate-400" />
                <h3 className="font-semibold mb-2">Select a Goal</h3>
                <p className="text-slate-600">
                  Click on a goal from the Active Goals tab to view detailed analytics.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}