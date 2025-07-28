import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useStudentDashboard } from "@/hooks/use-dashboard-data";
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
import { StudentAdminGoals } from "@/components/student-admin-goals";
import { EnhancedGoalDialog } from "@/components/enhanced-goal-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import type { Problem } from "@shared/schema";

export default function StudentDashboard() {
  const { user, logoutMutation } = useAuth();
  const [showSettings, setShowSettings] = useState(false);
  const [showGoalDialog, setShowGoalDialog] = useState(false);

  // Single optimized API call for all dashboard data
  const { data: dashboardData, isLoading } = useStudentDashboard();

  if (!user || user.type !== "student") {
    return null;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-slate-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // Extract data from optimized response with fallbacks
  const stats = dashboardData?.stats || { total: 0, completed: 0, in_progress: 0, not_started: 0 };
  const problems = dashboardData?.problems || [];
  const studentProgress = dashboardData?.progress || [];

  // Safe data handling for charts
  const hasValidStats = dashboardData?.stats && typeof dashboardData.stats === 'object';
  const hasValidProblems = Array.isArray(dashboardData?.problems);
  const hasValidProgress = Array.isArray(dashboardData?.progress);

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Navigation Header - Mobile Responsive */}
      <nav className="bg-white shadow-sm border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-14 sm:h-16">
            <div className="flex items-center space-x-2 sm:space-x-4 min-w-0 flex-1">
              <h1 className="text-lg sm:text-xl font-bold text-slate-800 truncate">DSA Tracker</h1>
              <span className="hidden sm:inline text-sm text-slate-500">|</span>
              <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-2 min-w-0">
                <span className="text-xs sm:text-sm text-slate-600 truncate">{user.name}</span>
                <Badge className="bg-primary/10 text-primary text-xs sm:text-sm mt-1 sm:mt-0">{user.department}</Badge>
              </div>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-4">
              <Dialog open={showSettings} onOpenChange={setShowSettings}>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="sm" className="p-2">
                    <Settings className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="w-[95vw] max-w-md mx-auto">
                  <DialogHeader>
                    <DialogTitle>Student Settings</DialogTitle>
                  </DialogHeader>
                  <StudentSettings studentRegNo={user.reg_no ?? ""} />
                </DialogContent>
              </Dialog>
              <Button variant="ghost" size="sm" onClick={handleLogout} className="p-2">
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8">
        {/* Dashboard Stats - Mobile Responsive */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-6 sm:mb-8">
          <Card>
            <CardContent className="p-3 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                <div className="mb-2 sm:mb-0">
                  <p className="text-xs sm:text-sm font-medium text-slate-600">Total</p>
                  <p className="text-xl sm:text-3xl font-bold text-slate-800">{hasValidStats ? stats.total : 0}</p>
                </div>
                <div className="bg-primary/10 p-2 sm:p-3 rounded-lg self-end sm:self-auto">
                  <Code className="text-primary h-4 w-4 sm:h-6 sm:w-6" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                <div className="mb-2 sm:mb-0">
                  <p className="text-xs sm:text-sm font-medium text-slate-600">Completed</p>
                  <p className="text-xl sm:text-3xl font-bold text-green-600">{hasValidStats ? stats.completed : 0}</p>
                </div>
                <div className="bg-green-100 p-2 sm:p-3 rounded-lg self-end sm:self-auto">
                  <CheckCircle className="text-green-600 h-4 w-4 sm:h-6 sm:w-6" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                <div className="mb-2 sm:mb-0">
                  <p className="text-xs sm:text-sm font-medium text-slate-600">In Progress</p>
                  <p className="text-xl sm:text-3xl font-bold text-yellow-600">{hasValidStats ? stats.in_progress : 0}</p>
                </div>
                <div className="bg-yellow-100 p-2 sm:p-3 rounded-lg self-end sm:self-auto">
                  <Clock className="text-yellow-600 h-4 w-4 sm:h-6 sm:w-6" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                <div className="mb-2 sm:mb-0">
                  <p className="text-xs sm:text-sm font-medium text-slate-600">Not Started</p>
                  <p className="text-xl sm:text-3xl font-bold text-slate-600">{hasValidStats ? stats.not_started : 0}</p>
                </div>
                <div className="bg-slate-100 p-2 sm:p-3 rounded-lg self-end sm:self-auto">
                  <Circle className="text-slate-600 h-4 w-4 sm:h-6 sm:w-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Admin Goals Section - Mobile Responsive */}
        <div className="mb-6 sm:mb-8">
          <StudentAdminGoals studentRegNo={user.reg_no ?? ""} />
        </div>

        {/* Student Goals Section - Mobile Responsive */}
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 gap-3">
            <h2 className="text-lg sm:text-xl font-semibold text-slate-800">My Learning Goals</h2>
            <Button 
              onClick={() => setShowGoalDialog(true)}
              className="flex items-center gap-2 bg-primary hover:bg-primary/90 w-full sm:w-auto justify-center sm:justify-start text-sm"
              size="sm"
            >
              <Target className="h-4 w-4" />
              Set Goal
            </Button>
          </div>
          <StudentGoals studentRegNo={user.reg_no ?? ""} />
          
          {/* Enhanced Goal Dialog */}
          <EnhancedGoalDialog 
            studentRegNo={user.reg_no ?? ""}
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
              {hasValidStats ? (
                <ProgressPieChart data={stats} />
              ) : (
                <div className="text-center text-slate-500 py-8">Loading chart...</div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Difficulty Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              {hasValidProblems ? (
                <DifficultyDoughnutChart problems={problems} />
              ) : (
                <div className="text-center text-slate-500 py-8">Loading chart...</div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Difficulty Level Progress</CardTitle>
            </CardHeader>
            <CardContent>
              {hasValidProgress ? (
                <DifficultyProgressChart problems={studentProgress} />
              ) : (
                <div className="text-center text-slate-500 py-8">Loading chart...</div>
              )}
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
            <CategoryProblemsView studentRegNo={user.reg_no ?? ""} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}