import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

function DonutChart({ value, maxValue = 100, label, color = '#3b82f6' }) {
  const percentage = (value / maxValue) * 100;
  const data = [
    { name: 'Used', value: percentage },
    { name: 'Free', value: 100 - percentage }
  ];

  const COLORS = [color, '#1e293b'];

  return (
    <div className="flex flex-col items-center">
      <ResponsiveContainer width={120} height={120}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={35}
            outerRadius={50}
            paddingAngle={2}
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index]} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="text-center mt-2">
        <div className="text-2xl font-bold">{percentage.toFixed(1)}%</div>
        <div className="text-sm text-gray-400">{label}</div>
      </div>
    </div>
  );
}

export default DonutChart;
