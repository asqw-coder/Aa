import { BarChart, Bar, ResponsiveContainer } from 'recharts';

interface MiniBarChartProps {
  data: Array<{
    name: string;
    value: number;
  }>;
  color?: string;
  height?: number;
}

export const MiniBarChart = ({ 
  data, 
  color = "hsl(var(--primary))",
  height = 60 
}: MiniBarChartProps) => {
  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
          <Bar 
            dataKey="value" 
            fill={color}
            radius={[2, 2, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};