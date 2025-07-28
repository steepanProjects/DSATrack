import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Edit, Save, X } from "lucide-react";

const editStudentSchema = z.object({
  name: z.string().min(1, "Name is required"),
  department: z.string().min(1, "Department is required"),
  newPassword: z.string().optional().or(z.literal("")),
});

type EditStudentFormData = z.infer<typeof editStudentSchema>;

interface Student {
  reg_no: string;
  name: string;
  department: string;
}

interface EditStudentDialogProps {
  student: Student | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DEPARTMENTS = [
  "AI&DS",
  "CSE", 
  "CSBS",
  "AI&ML"
];

export function EditStudentDialog({ student, open, onOpenChange }: EditStudentDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<EditStudentFormData>({
    resolver: zodResolver(editStudentSchema),
    defaultValues: {
      name: student?.name || "",
      department: student?.department || "",
      newPassword: "",
    },
  });

  // Reset form when student changes
  useEffect(() => {
    if (student) {
      form.reset({
        name: student.name,
        department: student.department,
        newPassword: "",
      });
    }
  }, [student, form]);

  const editStudentMutation = useMutation({
    mutationFn: async (data: EditStudentFormData) => {
      if (!student) throw new Error("No student selected");
      
      const updateData: any = {
        name: data.name,
        department: data.department,
      };
      
      if (data.newPassword && data.newPassword.length > 0) {
        updateData.password = data.newPassword;
      }
      
      return apiRequest("PUT", `/api/admin/students/${student.reg_no}`, updateData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/students"] });
      toast({
        title: "Student Updated Successfully!",
        description: "Student information has been updated.",
      });
      onOpenChange(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Update Student",
        description: error.message || "Please try again later.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: EditStudentFormData) => {
    editStudentMutation.mutate(data);
  };

  if (!student) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit className="h-5 w-5" />
            Edit Student Information
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Student Registration Number (Read-only) */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Registration Number</Label>
            <Input
              value={student.reg_no}
              disabled
              className="bg-slate-50 text-slate-600"
            />
            <p className="text-xs text-slate-500">Registration number cannot be changed</p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {/* Student Name */}
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Student Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter student name"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Department */}
              <FormField
                control={form.control}
                name="department"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Department</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select department" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {DEPARTMENTS.map((dept) => (
                          <SelectItem key={dept} value={dept}>
                            {dept}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* New Password (Optional) */}
              <FormField
                control={form.control}
                name="newPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New Password (Optional)</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="Leave blank to keep current password"
                        {...field}
                      />
                    </FormControl>
                    <p className="text-xs text-slate-500">
                      Leave blank to keep the current password. Minimum 8 characters if changing.
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Action Buttons */}
              <div className="flex justify-end space-x-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                >
                  <X className="h-4 w-4 mr-1" />
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={editStudentMutation.isPending}
                  className="min-w-[100px]"
                >
                  <Save className="h-4 w-4 mr-1" />
                  {editStudentMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}