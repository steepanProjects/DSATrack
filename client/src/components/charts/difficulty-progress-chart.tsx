import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

interface Problem {
  id: number;
  title: string;
  category: string;
  difficulty: string;
  status?: string;
}

interface DifficultyProgressChartProps {
  problems: Problem[];
}

const DIFFICULTY_COLORS = {
  Easy: "hsl(138.5, 76.5%, 48.7%)",
  Medium: "hsl(29, 95%, 55%)",
  Hard: "hsl(0, 72.2%, 60.9%)",
};

export function DifficultyProgressChart({ problems }: DifficultyProgressChartProps) {
  if (!problems || problems.length === 0) {
    return (
      <div className="w-full h-48 flex items-center justify-center text-slate-500">
        No progress data available
      </div>
    );
  }

  const difficultyStats = problems.reduce((acc, problem) => {
    const difficulty = problem.difficulty;
    if (!acc[difficulty]) {
      acc[difficulty] = { total: 0, completed: 0, in_progress: 0, not_started: 0 };
    }
    acc[difficulty].total += 1;
    
    if (problem.status === "completed") {
      acc[difficulty].completed += 1;
    } else if (problem.status === "in_progress") {
      acc[difficulty].in_progress += 1;
    } else {
      acc[difficulty].not_started += 1;
    }
    return acc;
  }, {} as Record<string, { total: number; completed: number; in_progress: number; not_started: number }>);

  const chartData = Object.entries(difficultyStats)
    .map(([difficulty, stats]) => ({
      name: difficulty,
      completed: stats.completed,
      in_progress: stats.in_progress,
      not_started: stats.not_started,
      total: stats.total,
      completionRate: Math.round((stats.completed / stats.total) * 100),
    }))
    .sort((a, b) => {
      const order = { Easy: 1, Medium: 2, Hard: 3 };
      return (order[a.name as keyof typeof order] || 999) - (order[b.name as keyof typeof order] || 999);
    });

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-slate-200 rounded shadow-lg">
          <p className="font-semibold text-slate-800">{`${label} Problems`}</p>
          <p className="text-green-600">{`Completed: ${data.completed}/${data.total} (${data.completionRate}%)`}</p>
          <p className="text-yellow-600">{`In Progress: ${data.in_progress}`}</p>
          <p className="text-slate-600">{`Not Started: ${data.not_started}`}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full h-48">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="name" 
            tick={{ fontSize: 12 }}
          />
          <YAxis tick={{ fontSize: 10 }} />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="completed" stackId="a" fill="hsl(138.5, 76.5%, 48.7%)" radius={[0, 0, 0, 0]} />
          <Bar dataKey="in_progress" stackId="a" fill="hsl(29, 95%, 55%)" radius={[0, 0, 0, 0]} />
          <Bar dataKey="not_started" stackId="a" fill="hsl(220, 13%, 69%)" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}