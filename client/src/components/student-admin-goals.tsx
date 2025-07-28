import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Calendar, Target, Clock, CheckCircle, Users } from "lucide-react";
import type { AdminGoal, StudentAdminGoal } from "@shared/schema";

interface StudentAdminGoalsProps {
  studentRegNo: string;
}

export function StudentAdminGoals({ studentRegNo }: StudentAdminGoalsProps) {
  const { data: adminGoals = [], isLoading } = useQuery({
    queryKey: ["/api/student", studentRegNo, "admin-goals"],
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  if (isLoading) {
    return (
      <div className="animate-pulse">
        <div className="h-4 bg-slate-200 rounded w-1/4 mb-4"></div>
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-24 bg-slate-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  if (adminGoals.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="p-6 text-center">
          <Users className="h-8 w-8 mx-auto mb-4 text-slate-400" />
          <h3 className="font-semibold mb-2 text-slate-700">No Admin Goals Assigned</h3>
          <p className="text-slate-600 text-sm">
            Your admin hasn't assigned any goals yet. Check back later!
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Users className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-semibold text-slate-800">Goals from Admin</h3>
        <Badge variant="outline" className="text-xs">
          {adminGoals.length} active
        </Badge>
      </div>

      <div className="space-y-3">
        {adminGoals.map((assignment: StudentAdminGoal & { adminGoal: AdminGoal }) => {
          const { adminGoal } = assignment;
          const progressPercentage = Math.min(
            (assignment.current_progress / adminGoal.target) * 100, 
            100
          );
          const isCompleted = assignment.is_completed;
          const isNearDeadline = adminGoal.deadline && 
            new Date(adminGoal.deadline) <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

          return (
            <Card 
              key={assignment.id} 
              className={`${isCompleted ? 'bg-green-50 border-green-200' : ''} 
                ${isNearDeadline && !isCompleted ? 'bg-orange-50 border-orange-200' : ''}`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    {isCompleted ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : (
                      <Target className="h-5 w-5 text-primary" />
                    )}
                    {adminGoal.title}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {adminGoal.type}
                    </Badge>
                    {isCompleted && (
                      <Badge variant="default" className="text-xs bg-green-600">
                        ✓ Completed
                      </Badge>
                    )}
                  </div>
                </div>
                
                {adminGoal.description && (
                  <p className="text-sm text-slate-600 mt-2">{adminGoal.description}</p>
                )}
              </CardHeader>
              
              <CardContent className="space-y-4">
                {/* Progress Info */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-1">
                      <Target className="h-4 w-4" />
                      Progress: {assignment.current_progress} / {adminGoal.target}
                    </span>
                    <span className="font-medium">
                      {Math.round(progressPercentage)}%
                    </span>
                  </div>
                  
                  <Progress 
                    value={progressPercentage} 
                    className={`h-2 ${isCompleted ? '[&>[data-state=complete]]:bg-green-600' : ''}`}
                  />
                </div>

                {/* Goal Details */}
                <div className="flex flex-wrap gap-4 text-sm text-slate-600">
                  {adminGoal.category && (
                    <div className="flex items-center gap-1">
                      <Badge variant="secondary" className="text-xs">
                        {adminGoal.category}
                      </Badge>
                    </div>
                  )}
                  
                  {adminGoal.difficulty && (
                    <div className="flex items-center gap-1">
                      <Badge 
                        variant={
                          adminGoal.difficulty === 'Easy' ? 'secondary' :
                          adminGoal.difficulty === 'Medium' ? 'default' : 'destructive'
                        }
                        className="text-xs"
                      >
                        {adminGoal.difficulty}
                      </Badge>
                    </div>
                  )}
                  
                  {adminGoal.deadline && (
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      <span className={isNearDeadline && !isCompleted ? 'text-orange-600 font-medium' : ''}>
                        Due: {new Date(adminGoal.deadline).toLocaleDateString()}
                      </span>
                      {isNearDeadline && !isCompleted && (
                        <Badge variant="destructive" className="text-xs ml-1">
                          Due Soon!
                        </Badge>
                      )}
                    </div>
                  )}
                </div>

                {/* Completion Info */}
                {isCompleted && assignment.completed_at && (
                  <div className="flex items-center gap-1 text-sm text-green-600 bg-green-50 p-2 rounded">
                    <CheckCircle className="h-4 w-4" />
                    <span>
                      Completed on {new Date(assignment.completed_at).toLocaleDateString()}
                    </span>
                  </div>
                )}

                {/* Time Tracking */}
                <div className="text-xs text-slate-500 flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Assigned on {new Date(assignment.assigned_at).toLocaleDateString()}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}