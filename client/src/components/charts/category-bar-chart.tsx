import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import type { Problem } from "@shared/schema";

interface ProblemWithProgress extends Problem {
  status?: string;
}

interface CategoryBarChartProps {
  problems: ProblemWithProgress[];
}

export function CategoryBarChart({ problems }: CategoryBarChartProps) {
  if (!problems || problems.length === 0) {
    return (
      <div className="w-full h-48 flex items-center justify-center text-slate-500">
        Loading...
      </div>
    );
  }

  const categoryStats = problems.reduce((acc, problem) => {
    const category = problem.category;
    if (!acc[category]) {
      acc[category] = { total: 0, completed: 0, in_progress: 0 };
    }
    acc[category].total += 1;
    if (problem.status === "completed") {
      acc[category].completed += 1;
    } else if (problem.status === "in_progress") {
      acc[category].in_progress += 1;
    }
    return acc;
  }, {} as Record<string, { total: number; completed: number; in_progress: number }>);

  const chartData = Object.entries(categoryStats)
    .map(([category, stats]) => ({
      name: category.length > 15 ? category.substring(0, 12) + "..." : category,
      completed: stats.completed,
      in_progress: stats.in_progress,
      not_started: stats.total - stats.completed - stats.in_progress,
    }))
    .slice(0, 6); // Show top 6 categories

  return (
    <div className="w-full h-48">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="name" 
            tick={{ fontSize: 10 }}
            interval={0}
            angle={-45}
            textAnchor="end"
            height={60}
          />
          <YAxis tick={{ fontSize: 10 }} />
          <Tooltip />
          <Bar dataKey="completed" stackId="a" fill="hsl(138.5, 76.5%, 48.7%)" />
          <Bar dataKey="in_progress" stackId="a" fill="hsl(29, 95%, 55%)" />
          <Bar dataKey="not_started" stackId="a" fill="hsl(0, 72.2%, 60.9%)" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
