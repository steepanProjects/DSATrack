import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Target, TrendingUp, Calendar, Clock } from "lucide-react";

interface Goal {
  id: number;
  type: "daily" | "weekly";
  target: number;
  current: number;
  date: string;
}

interface StudentGoalsProps {
  studentRegNo: string;
}

export function StudentGoals({ studentRegNo }: StudentGoalsProps) {
  const { data: goals } = useQuery<Goal[]>({
    queryKey: ["/api/student", studentRegNo, "goals"],
  });

  const { data: todayProgress } = useQuery<{ completed_today: number }>({
    queryKey: ["/api/student", studentRegNo, "today-progress"],
  });

  const { data: weekProgress } = useQuery<{ completed_week: number }>({
    queryKey: ["/api/student", studentRegNo, "week-progress"],
  });

  if (!goals || goals.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <Target className="h-12 w-12 text-slate-400 mx-auto mb-4" />
          <p className="text-slate-600">No goals set yet</p>
          <p className="text-sm text-slate-500">Set a daily or weekly goal to track your progress</p>
        </CardContent>
      </Card>
    );
  }

  const dailyGoal = goals.find(g => g.type === "daily");
  const weeklyGoal = goals.find(g => g.type === "weekly");

  const getProgressPercentage = (current: number, target: number) => {
    return Math.min(Math.round((current / target) * 100), 100);
  };

  const getStatusColor = (percentage: number) => {
    if (percentage >= 100) return "bg-green-500";
    if (percentage >= 75) return "bg-blue-500";
    if (percentage >= 50) return "bg-yellow-500";
    return "bg-slate-400";
  };

  const getStatusBadge = (percentage: number) => {
    if (percentage >= 100) return <Badge className="bg-green-100 text-green-700">Completed</Badge>;
    if (percentage >= 75) return <Badge className="bg-blue-100 text-blue-700">Almost There</Badge>;
    if (percentage >= 50) return <Badge className="bg-yellow-100 text-yellow-700">In Progress</Badge>;
    return <Badge className="bg-slate-100 text-slate-700">Just Started</Badge>;
  };

  return (
    <div className="space-y-4">
      {dailyGoal && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Daily Goal
            </CardTitle>
            {getStatusBadge(getProgressPercentage(todayProgress?.completed_today || 0, dailyGoal.target))}
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-600">
                  {todayProgress?.completed_today || 0} of {dailyGoal.target} problems
                </span>
                <span className="text-sm font-semibold">
                  {getProgressPercentage(todayProgress?.completed_today || 0, dailyGoal.target)}%
                </span>
              </div>
              <Progress 
                value={getProgressPercentage(todayProgress?.completed_today || 0, dailyGoal.target)} 
                className="h-2"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {weeklyGoal && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Weekly Goal
            </CardTitle>
            {getStatusBadge(getProgressPercentage(weekProgress?.completed_week || 0, weeklyGoal.target))}
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-600">
                  {weekProgress?.completed_week || 0} of {weeklyGoal.target} problems
                </span>
                <span className="text-sm font-semibold">
                  {getProgressPercentage(weekProgress?.completed_week || 0, weeklyGoal.target)}%
                </span>
              </div>
              <Progress 
                value={getProgressPercentage(weekProgress?.completed_week || 0, weeklyGoal.target)} 
                className="h-2"
              />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}