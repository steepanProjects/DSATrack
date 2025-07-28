import { useState } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Target, TrendingUp, Calendar, Clock, CheckCircle, AlertCircle, Plus, Minus } from "lucide-react";

const enhancedGoalSchema = z.object({
  type: z.enum(["daily", "weekly", "monthly"]),
  target: z.number().min(1, "Target must be at least 1").max(50, "Target should be realistic (max 50)"),
  category: z.string().optional(),
  difficulty: z.string().optional(),
  reminder: z.boolean().default(false),
  notes: z.string().optional(),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
});

type EnhancedGoalFormData = z.infer<typeof enhancedGoalSchema>;

interface Goal {
  id: number;
  type: "daily" | "weekly" | "monthly";
  target: number;
  category?: string;
  difficulty?: string;
  reminder: boolean;
  notes?: string;
  priority: "low" | "medium" | "high";
  created_at: string;
}

interface Problem {
  id: number;
  title: string;
  category: string;
  difficulty: string;
}

interface EnhancedGoalDialogProps {
  studentRegNo: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EnhancedGoalDialog({ studentRegNo, open, onOpenChange }: EnhancedGoalDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [goalPreview, setGoalPreview] = useState<number>(5);

  const { data: problems } = useQuery<Problem[]>({
    queryKey: ["/api/problems"],
  });

  const { data: existingGoals } = useQuery<Goal[]>({
    queryKey: ["/api/student", studentRegNo, "goals"],
  });

  const form = useForm<EnhancedGoalFormData>({
    resolver: zodResolver(enhancedGoalSchema),
    defaultValues: {
      type: "daily",
      target: 5,
      reminder: false,
      priority: "medium",
    },
  });

  const setGoalMutation = useMutation({
    mutationFn: async (data: EnhancedGoalFormData) => {
      return apiRequest("POST", `/api/student/${studentRegNo}/goals`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/student", studentRegNo, "goals"] });
      toast({
        title: "Goal Set Successfully!",
        description: "Your learning goal has been created and is now active.",
      });
      onOpenChange(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Set Goal",
        description: error.message || "Please try again later.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: EnhancedGoalFormData) => {
    setGoalMutation.mutate(data);
  };

  const categories = Array.from(new Set(problems?.map(p => p.category) || []));
  const difficulties = ["Easy", "Medium", "Hard"];

  const getGoalTypeDescription = (type: "daily" | "weekly" | "monthly") => {
    switch (type) {
      case "daily":
        return "Complete problems every day";
      case "weekly":
        return "Complete problems within a week";
      case "monthly":
        return "Complete problems within a month";
    }
  };

  const getPriorityColor = (priority: "low" | "medium" | "high") => {
    switch (priority) {
      case "low":
        return "bg-green-100 text-green-800";
      case "medium":
        return "bg-yellow-100 text-yellow-800";
      case "high":
        return "bg-red-100 text-red-800";
    }
  };

  const getRecommendedTarget = (type: "daily" | "weekly" | "monthly") => {
    switch (type) {
      case "daily":
        return { min: 2, max: 10, recommended: 5 };
      case "weekly":
        return { min: 10, max: 50, recommended: 25 };
      case "monthly":
        return { min: 30, max: 150, recommended: 80 };
    }
  };

  const watchedType = form.watch("type");
  const watchedTarget = form.watch("target");
  const recommendations = getRecommendedTarget(watchedType);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Set Enhanced Learning Goal
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Existing Goals Warning */}
          {existingGoals && existingGoals.length > 0 && (
            <Card className="border-amber-200 bg-amber-50">
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                  <span className="text-sm text-amber-800">
                    You have {existingGoals.length} active goal(s). Setting a new goal will add to your current goals.
                  </span>
                </div>
              </CardContent>
            </Card>
          )}

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Goal Type and Target */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
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
                          <SelectItem value="daily">
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4" />
                              Daily Goal
                            </div>
                          </SelectItem>
                          <SelectItem value="weekly">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4" />
                              Weekly Goal
                            </div>
                          </SelectItem>
                          <SelectItem value="monthly">
                            <div className="flex items-center gap-2">
                              <TrendingUp className="h-4 w-4" />
                              Monthly Goal
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-slate-500">
                        {getGoalTypeDescription(watchedType)}
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="target"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Target Problems</FormLabel>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => field.onChange(Math.max(1, field.value - 1))}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <FormControl>
                            <Input
                              type="number"
                              min="1"
                              max="50"
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                              className="text-center"
                            />
                          </FormControl>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => field.onChange(Math.min(50, field.value + 1))}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                        <div className="text-xs text-slate-500">
                          Recommended: {recommendations.recommended} problems
                          <br />
                          Range: {recommendations.min}-{recommendations.max}
                        </div>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Category and Difficulty Filters */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Focus Category (Optional)</FormLabel>
                      <Select onValueChange={(value) => field.onChange(value === "all" ? undefined : value)} value={field.value || "all"}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Any category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="all">All Categories</SelectItem>
                          {categories.map((category) => (
                            <SelectItem key={category} value={category}>
                              {category}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-slate-500">
                        Focus on specific category for targeted learning
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="difficulty"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Target Difficulty (Optional)</FormLabel>
                      <Select onValueChange={(value) => field.onChange(value === "all" ? undefined : value)} value={field.value || "all"}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Any difficulty" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="all">All Difficulties</SelectItem>
                          {difficulties.map((difficulty) => (
                            <SelectItem key={difficulty} value={difficulty}>
                              {difficulty}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-slate-500">
                        Challenge yourself with specific difficulty levels
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Priority and Reminder */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="priority"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Priority Level</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="low">Low Priority</SelectItem>
                          <SelectItem value="medium">Medium Priority</SelectItem>
                          <SelectItem value="high">High Priority</SelectItem>
                        </SelectContent>
                      </Select>
                      <div className="mt-1">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(field.value)}`}>
                          {field.value.charAt(0).toUpperCase() + field.value.slice(1)} Priority
                        </span>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="reminder"
                  render={({ field }) => (
                    <FormItem className="flex flex-col justify-between">
                      <FormLabel>Daily Reminder</FormLabel>
                      <div className="flex items-center space-x-2">
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <Label className="text-sm text-slate-600">
                          {field.value ? "Enabled" : "Disabled"}
                        </Label>
                      </div>
                      <p className="text-xs text-slate-500">
                        Get notified about your goal progress
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Notes */}
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Personal Notes (Optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Add motivation, specific topics to focus on, or personal reminders..."
                        {...field}
                        rows={3}
                      />
                    </FormControl>
                    <p className="text-xs text-slate-500">
                      Keep yourself motivated with personal notes
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Goal Preview */}
              <Card className="bg-blue-50 border-blue-200">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" />
                    Goal Preview
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-sm space-y-1">
                    <p>
                      <strong>Type:</strong> {watchedType.charAt(0).toUpperCase() + watchedType.slice(1)} goal
                    </p>
                    <p>
                      <strong>Target:</strong> {watchedTarget} problems {watchedType === "daily" ? "per day" : watchedType === "weekly" ? "per week" : "per month"}
                    </p>
                    {form.watch("category") && (
                      <p><strong>Category:</strong> {form.watch("category")}</p>
                    )}
                    {form.watch("difficulty") && (
                      <p><strong>Difficulty:</strong> {form.watch("difficulty")}</p>
                    )}
                    <p>
                      <strong>Priority:</strong> 
                      <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(form.watch("priority"))}`}>
                        {form.watch("priority")}
                      </span>
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={setGoalMutation.isPending}
                  className="min-w-[100px]"
                >
                  {setGoalMutation.isPending ? "Setting..." : "Set Goal"}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}