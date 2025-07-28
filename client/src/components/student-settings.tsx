import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Settings, Key, Target, Download } from "lucide-react";

const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string().min(1, "Please confirm your password"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

const goalSchema = z.object({
  type: z.enum(["daily", "weekly"]),
  target: z.number().min(1, "Target must be at least 1"),
});

interface StudentSettingsProps {
  studentRegNo: string;
}

export function StudentSettings({ studentRegNo }: StudentSettingsProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [showGoalDialog, setShowGoalDialog] = useState(false);

  const passwordForm = useForm({
    resolver: zodResolver(passwordChangeSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const goalForm = useForm({
    resolver: zodResolver(goalSchema),
    defaultValues: {
      type: "daily" as const,
      target: 1,
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: async (data: z.infer<typeof passwordChangeSchema>) => {
      const res = await apiRequest("PUT", `/api/student/${studentRegNo}/password`, {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Password Changed",
        description: "Your password has been updated successfully.",
      });
      setShowPasswordDialog(false);
      passwordForm.reset();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to change password. Please check your current password.",
        variant: "destructive",
      });
    },
  });

  const setGoalMutation = useMutation({
    mutationFn: async (data: z.infer<typeof goalSchema>) => {
      const res = await apiRequest("POST", `/api/student/${studentRegNo}/goals`, data);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Goal Set",
        description: "Your learning goal has been set successfully.",
      });
      setShowGoalDialog(false);
      goalForm.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/student", studentRegNo, "goals"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to set goal. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleExportSolvedProblems = async () => {
    try {
      const response = await fetch(`/api/student/${studentRegNo}/export-solved`, {
        credentials: "include",
      });
      
      if (!response.ok) {
        throw new Error('Export failed');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${studentRegNo}_solved_problems.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "Export Successful",
        description: "Your solved problems have been exported to CSV.",
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to export solved problems. Please try again.",
        variant: "destructive",
      });
    }
  };

  const onPasswordChange = async (data: z.infer<typeof passwordChangeSchema>) => {
    await changePasswordMutation.mutateAsync(data);
  };

  const onGoalSet = async (data: z.infer<typeof goalSchema>) => {
    await setGoalMutation.mutateAsync(data);
  };

  return (
    <div className="space-y-4">
      {/* Password Change */}
      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="flex items-center gap-2">
            <Key className="h-4 w-4" />
            Change Password
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Password</DialogTitle>
          </DialogHeader>
          <Form {...passwordForm}>
            <form onSubmit={passwordForm.handleSubmit(onPasswordChange)} className="space-y-4">
              <FormField
                control={passwordForm.control}
                name="currentPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Current Password</FormLabel>
                    <FormControl>
                      <Input type="password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={passwordForm.control}
                name="newPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New Password</FormLabel>
                    <FormControl>
                      <Input type="password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={passwordForm.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm New Password</FormLabel>
                    <FormControl>
                      <Input type="password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowPasswordDialog(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={changePasswordMutation.isPending}
                >
                  {changePasswordMutation.isPending ? "Changing..." : "Change Password"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Set Goals */}
      <Dialog open={showGoalDialog} onOpenChange={setShowGoalDialog}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            Set Goal
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set Learning Goal</DialogTitle>
          </DialogHeader>
          <Form {...goalForm}>
            <form onSubmit={goalForm.handleSubmit(onGoalSet)} className="space-y-4">
              <FormField
                control={goalForm.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Goal Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select goal type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="daily">Daily Goal</SelectItem>
                        <SelectItem value="weekly">Weekly Goal</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={goalForm.control}
                name="target"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Target Problems</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min="1"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowGoalDialog(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={setGoalMutation.isPending}
                >
                  {setGoalMutation.isPending ? "Setting..." : "Set Goal"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Export Solved Problems */}
      <Button 
        variant="outline" 
        size="sm" 
        onClick={handleExportSolvedProblems}
        className="flex items-center gap-2"
      >
        <Download className="h-4 w-4" />
        Export Solved Problems
      </Button>
    </div>
  );
}