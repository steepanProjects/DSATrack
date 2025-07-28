import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";

interface ProgressData {
  total: number;
  completed: number;
  in_progress: number;
  not_started: number;
}

interface ProgressPieChartProps {
  data: ProgressData | undefined;
}

const COLORS = {
  completed: "hsl(138.5, 76.5%, 48.7%)",
  in_progress: "hsl(29, 95%, 55%)",
  not_started: "hsl(0, 72.2%, 60.9%)",
};

export function ProgressPieChart({ data }: ProgressPieChartProps) {
  if (!data) {
    return (
      <div className="w-full h-48 flex items-center justify-center text-slate-500">
        Loading...
      </div>
    );
  }

  const chartData = [
    { name: "Completed", value: data.completed, color: COLORS.completed },
    { name: "In Progress", value: data.in_progress, color: COLORS.in_progress },
    { name: "Not Started", value: data.not_started, color: COLORS.not_started },
  ].filter(item => item.value > 0);

  if (chartData.length === 0) {
    return (
      <div className="w-full h-48 flex items-center justify-center text-slate-500">
        No data available
      </div>
    );
  }

  return (
    <div className="w-full h-48">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
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
