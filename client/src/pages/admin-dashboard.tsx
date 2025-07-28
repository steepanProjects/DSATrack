import { useState, useMemo, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Download, LogOut, Search, Users, TrendingUp, Watch, Plus, BarChart3, Key, Trash2, Upload, Trophy, Edit } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { ProgressPieChart } from "@/components/charts/progress-pie-chart";
import { DifficultyDoughnutChart } from "@/components/charts/difficulty-doughnut-chart";
import { DifficultyProgressChart } from "@/components/charts/difficulty-progress-chart";
import { EditStudentDialog } from "@/components/edit-student-dialog";
import { AdminGoalManagement } from "@/components/admin-goal-management";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import type { Student, Problem } from "@shared/schema";

const addStudentSchema = z.object({
  reg_no: z.string().min(1, "Registration number is required"),
  name: z.string().min(1, "Name is required"),
  department: z.string().min(1, "Department is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

interface StudentWithProgress extends Student {
  completed: number;
  in_progress: number;
  not_started: number;
  total: number;
}

export default function AdminDashboard() {
  const { user, logoutMutation } = useAuth();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [progressFilter, setProgressFilter] = useState("");
  const [completionFilter, setCompletionFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
  const [editingStudent, setEditingStudent] = useState<StudentWithProgress | null>(null);
  const [studentCsvFile, setStudentCsvFile] = useState<File | null>(null);
  const [progressCsvFile, setProgressCsvFile] = useState<File | null>(null);
  const itemsPerPage = 10;

  if (!user || user.type !== "admin") {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-800 mb-4">Access Denied</h1>
          <p className="text-slate-600">Admin access required to view this page.</p>
        </div>
      </div>
    );
  }

  const { data: students } = useQuery<StudentWithProgress[]>({
    queryKey: ["/api/admin/students"],
  });

  const { data: problems } = useQuery<Problem[]>({
    queryKey: ["/api/problems"],
    staleTime: 15 * 60 * 1000, // Problems rarely change
  });

  const { data: realDifficultyProgress } = useQuery<any[]>({
    queryKey: ["/api/admin/analytics/difficulty-progress"],
    staleTime: 5 * 60 * 1000, // Cache analytics for 5 minutes
  });

  const { data: studentDetails } = useQuery<any[]>({
    queryKey: ["/api/student", selectedStudent, "progress"],
    enabled: !!selectedStudent,
    staleTime: 2 * 60 * 1000, // Cache individual student data for 2 minutes
  });

  const addStudentMutation = useMutation({
    mutationFn: async (data: z.infer<typeof addStudentSchema>) => {
      const res = await apiRequest("POST", "/api/admin/students", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/students"] });
      setShowAddDialog(false);
      form.reset();
    },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: async (reg_no: string) => {
      const res = await apiRequest("PUT", `/api/admin/students/${reg_no}/reset-password`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/students"] });
    },
  });

  const deleteStudentMutation = useMutation({
    mutationFn: async (reg_no: string) => {
      const res = await apiRequest("DELETE", `/api/admin/students/${reg_no}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/students"] });
    },
  });

  const uploadStudentsCsvMutation = useMutation({
    mutationFn: async (csvData: string) => {
      const res = await apiRequest("POST", "/api/admin/upload-students-csv", { csvData });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/students"] });
      setStudentCsvFile(null);
    },
  });

  const uploadProgressCsvMutation = useMutation({
    mutationFn: async (csvData: string) => {
      const res = await apiRequest("POST", "/api/admin/upload-progress-csv", { csvData });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/students"] });
      setProgressCsvFile(null);
    },
  });

  const form = useForm({
    resolver: zodResolver(addStudentSchema),
    defaultValues: {
      reg_no: "",
      name: "",
      department: "",
      password: "12345678",
    },
  });

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  const handleExportCSV = async () => {
    try {
      const response = await fetch("/api/admin/export-csv", {
        credentials: "include",
      });
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "student-progress.csv";
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Failed to export CSV:", error);
    }
  };

  const onAddStudent = async (data: z.infer<typeof addStudentSchema>) => {
    await addStudentMutation.mutateAsync(data);
  };

  const handleStudentCsvUpload = async () => {
    if (!studentCsvFile) return;
    
    const text = await studentCsvFile.text();
    uploadStudentsCsvMutation.mutate(text);
  };

  const handleProgressCsvUpload = async () => {
    if (!progressCsvFile) return;
    
    const text = await progressCsvFile.text();
    uploadProgressCsvMutation.mutate(text);
  };

  // Filter and paginate students
  const filteredStudents = useMemo(() => {
    if (!students) return [];
    return students.filter(student => {
      const matchesSearch = searchTerm === "" || 
        student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.reg_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.department.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesDepartment = departmentFilter === "" || departmentFilter === "all" || student.department === departmentFilter;
      
      const completionPercentage = Math.round((student.completed / student.total) * 100);
      const matchesCompletion = completionFilter === "" || completionFilter === "all" || 
        (completionFilter === "high" && completionPercentage >= 70) ||
        (completionFilter === "medium" && completionPercentage >= 30 && completionPercentage < 70) ||
        (completionFilter === "low" && completionPercentage < 30);
      
      const matchesProgress = progressFilter === "" || progressFilter === "all" ||
        (progressFilter === "active" && (student.completed > 0 || student.in_progress > 0)) ||
        (progressFilter === "inactive" && student.completed === 0 && student.in_progress === 0) ||
        (progressFilter === "completed_high" && completionPercentage >= 90) ||
        (progressFilter === "in_progress" && student.in_progress > 0);
      
      return matchesSearch && matchesDepartment && matchesCompletion && matchesProgress;
    });
  }, [students, searchTerm, departmentFilter, progressFilter, completionFilter]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, departmentFilter, progressFilter, completionFilter]);

  const paginatedStudents = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredStudents.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredStudents, currentPage]);

  const totalPages = Math.ceil(filteredStudents.length / itemsPerPage);

  // Calculate local admin stats (keep separate from global stats API)
  const localAdminStats = useMemo(() => {
    if (!students) return { totalStudents: 0, avgCompletion: 0, activeStudents: 0 };
    
    const totalStudents = students.length;
    const avgCompletion = students.length > 0 
      ? Math.round(students.reduce((sum, s) => sum + (s.completed / s.total), 0) / students.length * 100)
      : 0;
    const activeStudents = students.filter(s => s.completed > 0 || s.in_progress > 0).length;

    return { totalStudents, avgCompletion, activeStudents };
  }, [students]);

  // Top performers calculation
  const topPerformers = useMemo(() => {
    if (!students) return [];
    return students
      .map(s => ({ ...s, percentage: Math.round((s.completed / s.total) * 100) }))
      .sort((a, b) => b.percentage - a.percentage)
      .slice(0, 5);
  }, [students]);

  // Global stats for charts
  const globalStats = useMemo(() => {
    if (!students) return { completed: 0, in_progress: 0, not_started: 0, total: 0 };
    
    const totals = students.reduce(
      (acc, student) => ({
        completed: acc.completed + student.completed,
        in_progress: acc.in_progress + student.in_progress,
        not_started: acc.not_started + student.not_started,
        total: acc.total + student.total
      }),
      { completed: 0, in_progress: 0, not_started: 0, total: 0 }
    );
    
    return totals;
  }, [students]);



  const getInitials = (name: string) => {
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const getDepartmentColor = (department: string) => {
    const colors = {
      "CSE": "bg-purple-100 text-purple-700",
      "CSBS": "bg-primary/10 text-primary",
      "AIML": "bg-orange-100 text-orange-700",
      "AI&DS": "bg-emerald-100 text-emerald-700",
    };
    return colors[department as keyof typeof colors] || "bg-slate-100 text-slate-700";
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Navigation Header */}
      <nav className="bg-slate-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <h1 className="text-xl font-bold text-white">DSA Progress Tracker</h1>
              <span className="text-slate-400">|</span>
              <Badge className="bg-slate-700 text-white">Admin Panel</Badge>
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="sm" onClick={handleExportCSV} className="text-slate-300 hover:text-white">
                <Download className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={handleLogout} className="text-slate-300 hover:text-white">
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8">
        {/* Admin Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Total Students</p>
                  <p className="text-3xl font-bold text-slate-800">{localAdminStats.totalStudents}</p>
                </div>
                <div className="bg-primary/10 p-3 rounded-lg">
                  <Users className="text-primary h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Avg. Completion</p>
                  <p className="text-3xl font-bold text-secondary">{localAdminStats.avgCompletion}%</p>
                </div>
                <div className="bg-secondary/10 p-3 rounded-lg">
                  <TrendingUp className="text-secondary h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Active Students</p>
                  <p className="text-3xl font-bold text-accent">{localAdminStats.activeStudents}</p>
                </div>
                <div className="bg-accent/10 p-3 rounded-lg">
                  <Watch className="text-accent h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Admin Dashboard Charts and Analytics */}
        <Tabs defaultValue="students" className="w-full mb-8">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4">
            <TabsTrigger value="students" className="text-xs sm:text-sm">Students</TabsTrigger>
            <TabsTrigger value="goals" className="text-xs sm:text-sm">Goals</TabsTrigger>
            <TabsTrigger value="analytics" className="text-xs sm:text-sm">Analytics</TabsTrigger>
            <TabsTrigger value="upload" className="text-xs sm:text-sm">Upload</TabsTrigger>
          </TabsList>
          
          <TabsContent value="goals" className="space-y-6">
            <AdminGoalManagement />
          </TabsContent>

          <TabsContent value="analytics" className="space-y-8">
            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PieChart className="h-5 w-5" />
                    Global Progress Overview
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ProgressPieChart data={globalStats} />
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Problem Difficulty Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <DifficultyDoughnutChart problems={problems || []} />
                </CardContent>
              </Card>
            </div>

            {/* Category Heatmap and Top Performers */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Difficulty Level Progress</CardTitle>
                </CardHeader>
                <CardContent>
                  {realDifficultyProgress ? (
                    <div className="space-y-4">
                      {realDifficultyProgress.map((diffData) => (
                        <div key={diffData.difficulty} className="p-4 rounded-lg border">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-semibold text-lg">{diffData.difficulty}</h4>
                            <span className="text-sm text-slate-600">
                              {diffData.total_problems} problems
                            </span>
                          </div>
                          
                          <div className="grid grid-cols-3 gap-4 text-center">
                            <div>
                              <p className="text-2xl font-bold text-green-600">
                                {Math.round(diffData.completed_by_students / diffData.total_problems)}
                              </p>
                              <p className="text-xs text-slate-600">Avg Completed</p>
                            </div>
                            <div>
                              <p className="text-2xl font-bold text-yellow-600">
                                {Math.round(diffData.in_progress_by_students / diffData.total_problems)}
                              </p>
                              <p className="text-xs text-slate-600">Avg In Progress</p>
                            </div>
                            <div>
                              <p className="text-2xl font-bold text-slate-600">
                                {Math.round(diffData.not_started_by_students / diffData.total_problems)}
                              </p>
                              <p className="text-xs text-slate-600">Avg Not Started</p>
                            </div>
                          </div>
                          
                          <div className="mt-3">
                            <div className="flex text-xs text-slate-600 mb-1">
                              <span>Completion Rate: {Math.round((diffData.completed_by_students / diffData.total_student_attempts) * 100)}%</span>
                            </div>
                            <div className="w-full bg-slate-200 rounded-full h-2">
                              <div 
                                className="bg-green-600 h-2 rounded-full"
                                style={{ 
                                  width: `${Math.round((diffData.completed_by_students / diffData.total_student_attempts) * 100)}%` 
                                }}
                              ></div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-slate-500">
                      Loading difficulty progress data...
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Trophy className="h-5 w-5" />
                    Top Performers
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {topPerformers.map((student, index) => (
                      <div key={student.reg_no} className="flex items-center justify-between p-3 rounded-lg bg-slate-50">
                        <div className="flex items-center space-x-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                            index === 0 ? 'bg-yellow-100 text-yellow-700' :
                            index === 1 ? 'bg-gray-100 text-gray-700' :
                            index === 2 ? 'bg-orange-100 text-orange-700' :
                            'bg-slate-100 text-slate-700'
                          }`}>
                            {index + 1}
                          </div>
                          <div>
                            <p className="font-medium text-slate-800">{student.name}</p>
                            <p className="text-sm text-slate-600">{student.department}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-slate-800">{student.percentage}%</p>
                          <p className="text-sm text-slate-600">{student.completed}/{student.total}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="upload" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Upload className="h-5 w-5" />
                    Upload Students CSV
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <p className="text-sm text-slate-600">
                      Upload a CSV file with student data. Required columns: reg_no, name, department, password
                    </p>
                    <Input 
                      type="file" 
                      accept=".csv" 
                      className="cursor-pointer" 
                      onChange={(e) => setStudentCsvFile(e.target.files?.[0] || null)}
                    />
                    <Button 
                      className="w-full" 
                      onClick={handleStudentCsvUpload}
                      disabled={!studentCsvFile || uploadStudentsCsvMutation.isPending}
                    >
                      {uploadStudentsCsvMutation.isPending ? "Uploading..." : "Upload Students"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Upload className="h-5 w-5" />
                    Upload Progress CSV
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <p className="text-sm text-slate-600">
                      Upload progress data. Required columns: reg_no, problem_id, status
                    </p>
                    <Input 
                      type="file" 
                      accept=".csv" 
                      className="cursor-pointer"
                      onChange={(e) => setProgressCsvFile(e.target.files?.[0] || null)}
                    />
                    <Button 
                      className="w-full"
                      onClick={handleProgressCsvUpload}
                      disabled={!progressCsvFile || uploadProgressCsvMutation.isPending}
                    >
                      {uploadProgressCsvMutation.isPending ? "Uploading..." : "Upload Progress"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="students">
            {/* Students Management */}
            <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <CardTitle>Student Management</CardTitle>
              <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Search students..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 w-full sm:w-64"
                  />
                </div>
                <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Student
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add New Student</DialogTitle>
                    </DialogHeader>
                    <Form {...form}>
                      <form onSubmit={form.handleSubmit(onAddStudent)} className="space-y-4">
                        <FormField
                          control={form.control}
                          name="reg_no"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Registration Number</FormLabel>
                              <FormControl>
                                <Input placeholder="e.g., 711523BCS001" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Full Name</FormLabel>
                              <FormControl>
                                <Input placeholder="Enter full name" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="department"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Department</FormLabel>
                              <FormControl>
                                <Input placeholder="e.g., CSE, CSBS, AIML, AI&DS" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="password"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Password</FormLabel>
                              <FormControl>
                                <Input type="password" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <div className="flex justify-end space-x-3">
                          <Button type="button" variant="outline" onClick={() => setShowAddDialog(false)}>
                            Cancel
                          </Button>
                          <Button type="submit" disabled={addStudentMutation.isPending}>
                            {addStudentMutation.isPending ? "Adding..." : "Add Student"}
                          </Button>
                        </div>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
                <Button variant="secondary" onClick={handleExportCSV} className="w-full sm:w-auto">
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </Button>
              </div>
            </div>
            
            {/* Filter Controls */}
            <div className="flex flex-col sm:flex-row gap-3 mt-4 px-6 pb-4 border-b border-slate-200">
              <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Filter by Department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  <SelectItem value="CSE">CSE</SelectItem>
                  <SelectItem value="CSBS">CSBS</SelectItem>
                  <SelectItem value="AIML">AIML</SelectItem>
                  <SelectItem value="AI&DS">AI&DS</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={progressFilter} onValueChange={setProgressFilter}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Filter by Activity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Students</SelectItem>
                  <SelectItem value="active">Active Students</SelectItem>
                  <SelectItem value="inactive">Inactive Students</SelectItem>
                  <SelectItem value="completed_high">High Performers (90%+)</SelectItem>
                  <SelectItem value="in_progress">Currently Working</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={completionFilter} onValueChange={setCompletionFilter}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Filter by Completion" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Levels</SelectItem>
                  <SelectItem value="high">High (70%+)</SelectItem>
                  <SelectItem value="medium">Medium (30-70%)</SelectItem>
                  <SelectItem value="low">Low (&lt;30%)</SelectItem>
                </SelectContent>
              </Select>
              
              {(departmentFilter || progressFilter || completionFilter) && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => {
                    setDepartmentFilter("");
                    setProgressFilter("");
                    setCompletionFilter("");
                    setCurrentPage(1);
                  }}
                  className="whitespace-nowrap"
                >
                  Clear Filters
                </Button>
              )}
            </div>
            
            {/* Results Summary */}
            <div className="px-6 py-3 bg-slate-50 border-b border-slate-200">
              <p className="text-sm text-slate-600">
                Showing {paginatedStudents.length} of {filteredStudents.length} students
                {(departmentFilter || progressFilter || completionFilter) && 
                  ` (filtered from ${students?.length || 0} total)`
                }
              </p>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {/* Mobile Card Layout - Visible on small screens */}
            <div className="block md:hidden">
              <div className="divide-y divide-slate-200">
                {paginatedStudents.map((student: StudentWithProgress) => (
                  <div key={student.reg_no} className="p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="min-w-0 flex-1">
                        <h3 className="font-medium text-slate-900 truncate">{student.name}</h3>
                        <p className="text-sm text-slate-600">{student.reg_no}</p>
                        <Badge variant="secondary" className="text-xs mt-1">
                          {student.department}
                        </Badge>
                      </div>
                      <div className="ml-3 flex flex-col items-end gap-1">
                        <div className="text-lg font-bold text-green-600">
                          {Math.round((student.completed / student.total) * 100)}%
                        </div>
                        <div className="text-xs text-slate-500">
                          {student.completed}/{student.total}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedStudent(student.reg_no)}
                        className="flex-1 text-xs"
                      >
                        <BarChart3 className="h-3 w-3 mr-1" />
                        View
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditingStudent(student);
                          setShowEditDialog(true);
                        }}
                        className="flex-1 text-xs"
                      >
                        <Edit className="h-3 w-3 mr-1" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => resetPasswordMutation.mutate(student.reg_no)}
                        className="flex-1 text-xs"
                      >
                        <Key className="h-3 w-3 mr-1" />
                        Reset
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Desktop Table Layout - Hidden on small screens */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-left px-6 py-4 text-sm font-medium text-slate-600">Student</th>
                    <th className="text-left px-6 py-4 text-sm font-medium text-slate-600">Registration</th>
                    <th className="text-left px-6 py-4 text-sm font-medium text-slate-600">Department</th>
                    <th className="text-left px-6 py-4 text-sm font-medium text-slate-600">Progress</th>
                    <th className="text-left px-6 py-4 text-sm font-medium text-slate-600">Completed</th>
                    <th className="text-left px-6 py-4 text-sm font-medium text-slate-600">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {paginatedStudents.map((student) => {
                    const percentage = Math.round((student.completed / student.total) * 100);
                    return (
                      <tr key={student.reg_no} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center text-sm font-medium">
                              {getInitials(student.name)}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-slate-800">{student.name}</p>
                              <p className="text-xs text-slate-500">Last active: 2 hours ago</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-slate-600">{student.reg_no}</span>
                        </td>
                        <td className="px-6 py-4">
                          <Badge className={getDepartmentColor(student.department)}>{student.department}</Badge>
                        </td>
                        <td className="px-6 py-4">
                          <div className="w-full bg-slate-200 rounded-full h-2 mb-1">
                            <div
                              className="bg-secondary h-2 rounded-full"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                          <p className="text-xs text-slate-500">
                            {percentage}% ({student.completed}/{student.total})
                          </p>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm font-medium text-secondary">{student.completed}</span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-2">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              title="View Progress"
                              onClick={() => setSelectedStudent(student.reg_no)}
                            >
                              <BarChart3 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              title="Edit Student"
                              onClick={() => {
                                setEditingStudent(student);
                                setShowEditDialog(true);
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              title="Reset Password"
                              onClick={() => resetPasswordMutation.mutate(student.reg_no)}
                            >
                              <Key className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              title="Remove Student"
                              onClick={() => deleteStudentMutation.mutate(student.reg_no)}
                              className="text-danger hover:text-danger"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="px-3 sm:px-6 py-4 border-t border-slate-200">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <p className="text-xs sm:text-sm text-slate-600 text-center sm:text-left">
                  Showing {(currentPage - 1) * itemsPerPage + 1}-{Math.min(currentPage * itemsPerPage, filteredStudents.length)} of {filteredStudents.length} students
                </p>
                <div className="flex items-center space-x-1 sm:space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="text-xs sm:text-sm px-2 sm:px-3"
                  >
                    Previous
                  </Button>
                  {Array.from({ length: Math.min(3, totalPages) }, (_, i) => {
                    const page = i + 1;
                    return (
                      <Button
                        key={page}
                        variant={currentPage === page ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCurrentPage(page)}
                        className={`text-xs sm:text-sm px-2 sm:px-3 ${currentPage === page ? "bg-slate-800 text-white" : ""}`}
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
                    className="text-xs sm:text-sm px-2 sm:px-3"
                  >
                    Next
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
          </TabsContent>
        </Tabs>

        {/* Student Details Modal */}
        {selectedStudent && (
          <Dialog open={!!selectedStudent} onOpenChange={() => setSelectedStudent(null)}>
            <DialogContent className="w-[95vw] max-w-4xl max-h-[85vh] overflow-y-auto mx-auto" aria-describedby="student-progress-description">
              <DialogHeader>
                <DialogTitle className="text-lg sm:text-xl">Student Progress Details</DialogTitle>
              </DialogHeader>
              <p id="student-progress-description" className="sr-only">
                Detailed view of student's progress across all DSA problems including completion status and notes
              </p>
              <div className="space-y-4 sm:space-y-6 px-1 sm:px-0">
                {studentDetails && Array.isArray(studentDetails) && (
                  <>
                    {/* Overall Statistics - Mobile Responsive */}
                    <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-4 sm:mb-6">
                      <Card>
                        <CardContent className="p-2 sm:p-4">
                          <p className="text-xs sm:text-sm text-slate-600">Completed</p>
                          <p className="text-lg sm:text-2xl font-bold text-green-600">
                            {studentDetails.filter((p: any) => p.status === 'completed').length}
                          </p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="p-2 sm:p-4">
                          <p className="text-xs sm:text-sm text-slate-600">In Progress</p>
                          <p className="text-lg sm:text-2xl font-bold text-yellow-600">
                            {studentDetails.filter((p: any) => p.status === 'in_progress').length}
                          </p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="p-2 sm:p-4">
                          <p className="text-xs sm:text-sm text-slate-600">Not Started</p>
                          <p className="text-lg sm:text-2xl font-bold text-slate-600">
                            {studentDetails.filter((p: any) => p.status === 'not_started').length}
                          </p>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Difficulty Level Statistics - Mobile Responsive */}
                    <Card className="mb-4 sm:mb-6">
                      <CardHeader className="pb-3 sm:pb-4">
                        <CardTitle className="text-base sm:text-lg">Progress by Difficulty Level</CardTitle>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="grid grid-cols-1 gap-3 sm:gap-4">
                          {(() => {
                            const easyProblems = studentDetails.filter((p: any) => p.difficulty === 'Easy');
                            const mediumProblems = studentDetails.filter((p: any) => p.difficulty === 'Medium');
                            const hardProblems = studentDetails.filter((p: any) => p.difficulty === 'Hard');
                            
                            const difficultyStats = [
                              {
                                name: 'Easy',
                                total: easyProblems.length,
                                completed: easyProblems.filter((p: any) => p.status === 'completed').length,
                                color: 'text-green-600',
                                bgColor: 'bg-green-50 border-green-200'
                              },
                              {
                                name: 'Medium',
                                total: mediumProblems.length,
                                completed: mediumProblems.filter((p: any) => p.status === 'completed').length,
                                color: 'text-orange-600',
                                bgColor: 'bg-orange-50 border-orange-200'
                              },
                              {
                                name: 'Hard',
                                total: hardProblems.length,
                                completed: hardProblems.filter((p: any) => p.status === 'completed').length,
                                color: 'text-red-600',
                                bgColor: 'bg-red-50 border-red-200'
                              }
                            ];

                            return difficultyStats.map((stat) => (
                              <Card key={stat.name} className={`border-2 ${stat.bgColor}`}>
                                <CardContent className="p-3 sm:p-4">
                                  <div className="flex items-center justify-between mb-2">
                                    <h3 className="text-sm sm:text-base font-semibold text-slate-800">{stat.name}</h3>
                                    <Badge className={`text-xs ${stat.color.replace('text-', 'bg-').replace('-600', '-100')} ${stat.color}`}>
                                      {stat.total > 0 ? Math.round((stat.completed / stat.total) * 100) : 0}%
                                    </Badge>
                                  </div>
                                  <p className="text-xs sm:text-sm text-slate-600 mb-2">
                                    {stat.completed} of {stat.total} completed
                                  </p>
                                  <div className="w-full bg-slate-200 rounded-full h-2">
                                    <div 
                                      className={`h-2 rounded-full ${stat.color.replace('text-', 'bg-')}`}
                                      style={{ width: `${stat.total > 0 ? (stat.completed / stat.total) * 100 : 0}%` }}
                                    ></div>
                                  </div>
                                </CardContent>
                              </Card>
                            ));
                          })()}
                        </div>
                      </CardContent>
                    </Card>
                    
                    {/* Progress Charts - Mobile Responsive */}
                    <div className="grid grid-cols-1 gap-4 sm:gap-6">
                      <Card>
                        <CardHeader className="pb-3 sm:pb-4">
                          <CardTitle className="text-base sm:text-lg">Overall Progress Distribution</CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0">
                          <div className="h-64 sm:h-80">
                            <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                <Pie
                                  data={(() => {
                                    const completed = studentDetails.filter((p: any) => p.status === 'completed').length;
                                    const inProgress = studentDetails.filter((p: any) => p.status === 'in_progress').length;
                                    const notStarted = studentDetails.filter((p: any) => p.status === 'not_started').length;
                                    
                                    return [
                                      { name: 'Completed', value: completed, color: '#22c55e' },
                                      { name: 'In Progress', value: inProgress, color: '#eab308' },
                                      { name: 'Not Started', value: notStarted, color: '#64748b' }
                                    ].filter(item => item.value > 0);
                                  })()}
                                  cx="50%"
                                  cy="50%"
                                  labelLine={false}
                                  label={({ name, value, percent }) => `${name}: ${value} (${(percent * 100).toFixed(0)}%)`}
                                  outerRadius={60}
                                  fill="#8884d8"
                                  dataKey="value"
                                >
                                  {(() => {
                                    const completed = studentDetails.filter((p: any) => p.status === 'completed').length;
                                    const inProgress = studentDetails.filter((p: any) => p.status === 'in_progress').length;
                                    const notStarted = studentDetails.filter((p: any) => p.status === 'not_started').length;
                                    
                                    return [
                                      { name: 'Completed', value: completed, color: '#22c55e' },
                                      { name: 'In Progress', value: inProgress, color: '#eab308' },
                                      { name: 'Not Started', value: notStarted, color: '#64748b' }
                                    ].filter(item => item.value > 0);
                                  })().map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                  ))}
                                </Pie>
                                <Tooltip 
                                  formatter={(value: any) => [value, 'Problems']}
                                />
                                <Legend />
                              </PieChart>
                            </ResponsiveContainer>
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="pb-3 sm:pb-4">
                          <CardTitle className="text-base sm:text-lg">Difficulty Level Progress</CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0">
                          <div className="h-64 sm:h-80 flex items-center justify-center">
                            <DifficultyProgressChart problems={studentDetails || []} />
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </>
                )}

              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* Edit Student Dialog */}
        <EditStudentDialog
          student={editingStudent}
          open={showEditDialog}
          onOpenChange={setShowEditDialog}
        />
      </div>
    </div>
  );
}
