import { useState, useMemo } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Download, LogOut, Search, Users, TrendingUp, Watch, Plus, BarChart3, Key, Trash2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import type { Student } from "@shared/schema";

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
  const [currentPage, setCurrentPage] = useState(1);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const itemsPerPage = 10;

  if (!user || user.type !== "admin") {
    return null;
  }

  const { data: students } = useQuery<StudentWithProgress[]>({
    queryKey: ["/api/admin/students"],
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

  // Filter and paginate students
  const filteredStudents = useMemo(() => {
    if (!students) return [];
    return students.filter(student =>
      student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.reg_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.department.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [students, searchTerm]);

  const paginatedStudents = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredStudents.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredStudents, currentPage]);

  const totalPages = Math.ceil(filteredStudents.length / itemsPerPage);

  // Calculate admin stats
  const adminStats = useMemo(() => {
    if (!students) return { totalStudents: 0, avgCompletion: 0, activeStudents: 0 };
    
    const totalStudents = students.length;
    const avgCompletion = students.length > 0 
      ? Math.round(students.reduce((sum, s) => sum + (s.completed / s.total), 0) / students.length * 100)
      : 0;
    const activeStudents = students.filter(s => s.completed > 0 || s.in_progress > 0).length;

    return { totalStudents, avgCompletion, activeStudents };
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Admin Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Total Students</p>
                  <p className="text-3xl font-bold text-slate-800">{adminStats.totalStudents}</p>
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
                  <p className="text-3xl font-bold text-secondary">{adminStats.avgCompletion}%</p>
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
                  <p className="text-3xl font-bold text-accent">{adminStats.activeStudents}</p>
                </div>
                <div className="bg-accent/10 p-3 rounded-lg">
                  <Watch className="text-accent h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

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
                <Button variant="secondary" onClick={handleExportCSV}>
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
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
                            <Button variant="ghost" size="sm" title="View Progress">
                              <BarChart3 className="h-4 w-4" />
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
            <div className="px-6 py-4 border-t border-slate-200">
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-600">
                  Showing {(currentPage - 1) * itemsPerPage + 1}-{Math.min(currentPage * itemsPerPage, filteredStudents.length)} of {filteredStudents.length} students
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
                        className={currentPage === page ? "bg-slate-800 text-white" : ""}
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
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
