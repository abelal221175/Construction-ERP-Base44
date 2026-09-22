import React from 'react';
import { Line, LineChart, ResponsiveContainer, YAxis } from 'recharts';

export default function Sparkline({ data, color = '#90A4AE' }) {
  if (!data || data.length < 2) return null;
  return (
    <div className="w-16 h-6 shrink-0">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 1, bottom: 1, left: 0, right: 0 }}>
          <YAxis domain={['dataMin', 'dataMax']} hide />
          <Line
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={1.25}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}