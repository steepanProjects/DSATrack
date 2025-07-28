import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import type { Problem } from "@shared/schema";

interface DifficultyDoughnutChartProps {
  problems: Problem[];
}

const COLORS = {
  Easy: "hsl(138.5, 76.5%, 48.7%)",
  Medium: "hsl(29, 95%, 55%)",
  Hard: "hsl(0, 72.2%, 60.9%)",
};

export function DifficultyDoughnutChart({ problems }: DifficultyDoughnutChartProps) {
  if (!problems || problems.length === 0) {
    return (
      <div className="w-full h-48 flex items-center justify-center text-slate-500">
        Loading...
      </div>
    );
  }

  const difficultyCounts = problems.reduce((acc, problem) => {
    acc[problem.difficulty] = (acc[problem.difficulty] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const chartData = Object.entries(difficultyCounts).map(([difficulty, count]) => ({
    name: difficulty,
    value: count,
    color: COLORS[difficulty as keyof typeof COLORS] || "#8884d8",
  }));

  return (
    <div className="w-full h-48">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={30}
            outerRadius={60}
            fill="#8884d8"
            dataKey="value"
            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
            labelLine={false}
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
