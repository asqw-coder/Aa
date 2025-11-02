import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

interface DonutChartProps {
  data: Array<{
    name: string;
    value: number;
    color: string;
  }>;
  centerValue?: string;
  centerLabel?: string;
  size?: number;
}

export const DonutChart = ({ 
  data, 
  centerValue, 
  centerLabel,
  size = 200 
}: DonutChartProps) => {
  const total = data.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="relative w-full h-full flex items-center justify-center">
      <ResponsiveContainer width="100%" height={size}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={size * 0.25}
            outerRadius={size * 0.4}
            startAngle={90}
            endAngle={-270}
            paddingAngle={2}
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      
      {/* Center content */}
      {centerValue && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <p className="text-2xl font-bold text-foreground">{centerValue}</p>
          {centerLabel && (
            <p className="text-xs text-muted-foreground">{centerLabel}</p>
          )}
        </div>
      )}
    </div>
  );
};