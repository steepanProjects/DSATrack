import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Settings, LogOut, Code, CheckCircle, Clock, Circle, Target, Plus } from "lucide-react";
import { ProgressPieChart } from "@/components/charts/progress-pie-chart";
import { DifficultyDoughnutChart } from "@/components/charts/difficulty-doughnut-chart";
import { DifficultyProgressChart } from "@/components/charts/difficulty-progress-chart";
import { CategoryProblemsView } from "@/components/category-problems-view";
import { StudentSettings } from "@/components/student-settings";
import { StudentGoals } from "@/components/student-goals";
import { EnhancedGoalDialog } from "@/components/enhanced-goal-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import type { Problem } from "@shared/schema";

export default function StudentDashboard() {
  const { user, logoutMutation } = useAuth();
  const [showSettings, setShowSettings] = useState(false);
  const [showGoalDialog, setShowGoalDialog] = useState(false);

  if (!user || user.type !== "student") {
    return null;
  }

  const { data: stats } = useQuery({
    queryKey: ["/api/student", user.reg_no, "stats"],
  });

  const { data: problems } = useQuery<Problem[]>({
    queryKey: ["/api/problems"],
  });

  const { data: studentProgress } = useQuery({
    queryKey: ["/api/student", user.reg_no, "progress"],
  });

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Navigation Header */}
      <nav className="bg-white shadow-sm border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <h1 className="text-xl font-bold text-slate-800">DSA Progress Tracker</h1>
              <span className="text-sm text-slate-500">|</span>
              <span className="text-sm text-slate-600">{user.name}</span>
              <Badge className="bg-primary/10 text-primary">{user.department}</Badge>
            </div>
            <div className="flex items-center space-x-4">
              <Dialog open={showSettings} onOpenChange={setShowSettings}>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <Settings className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Student Settings</DialogTitle>
                  </DialogHeader>
                  <StudentSettings studentRegNo={user.reg_no} />
                </DialogContent>
              </Dialog>
              <Button variant="ghost" size="sm" onClick={handleLogout}>
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Dashboard Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Total Problems</p>
                  <p className="text-3xl font-bold text-slate-800">{stats?.total || 0}</p>
                </div>
                <div className="bg-primary/10 p-3 rounded-lg">
                  <Code className="text-primary h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Completed</p>
                  <p className="text-3xl font-bold text-secondary">{stats?.completed || 0}</p>
                </div>
                <div className="bg-secondary/10 p-3 rounded-lg">
                  <CheckCircle className="text-secondary h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">In Progress</p>
                  <p className="text-3xl font-bold text-accent">{stats?.in_progress || 0}</p>
                </div>
                <div className="bg-accent/10 p-3 rounded-lg">
                  <Clock className="text-accent h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Not Started</p>
                  <p className="text-3xl font-bold text-danger">{stats?.not_started || 0}</p>
                </div>
                <div className="bg-danger/10 p-3 rounded-lg">
                  <Circle className="text-danger h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Goals Section */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-slate-800">Learning Goals</h2>
            <Button 
              onClick={() => setShowGoalDialog(true)}
              className="flex items-center gap-2 bg-primary hover:bg-primary/90"
            >
              <Target className="h-4 w-4" />
              Set Goal
            </Button>
          </div>
          <StudentGoals studentRegNo={user.reg_no} />
          
          {/* Enhanced Goal Dialog */}
          <EnhancedGoalDialog 
            studentRegNo={user.reg_no}
            open={showGoalDialog}
            onOpenChange={setShowGoalDialog}
          />
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Progress Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <ProgressPieChart data={stats} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Difficulty Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <DifficultyDoughnutChart problems={problems || []} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Difficulty Level Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <DifficultyProgressChart problems={studentProgress || []} />
            </CardContent>
          </Card>
        </div>

        {/* Category-based Problems View */}
        <Card>
          <CardHeader>
            <CardTitle>DSA Problems by Category</CardTitle>
            <p className="text-sm text-slate-600">
              Use checkboxes to mark problems as completed. Problems are organized by categories for better learning structure.
            </p>
          </CardHeader>
          <CardContent>
            <CategoryProblemsView studentRegNo={user.reg_no} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}