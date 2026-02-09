import React from 'react';

function GaugeChart({ value, maxValue = 100, label, thresholds = { warning: 70, critical: 90 } }) {
  const percentage = Math.min((value / maxValue) * 100, 100);
  const angle = (percentage / 100) * 180 - 90;

  const getColor = () => {
    if (percentage >= thresholds.critical) return '#ef4444';
    if (percentage >= thresholds.warning) return '#f59e0b';
    return '#10b981';
  };

  const color = getColor();

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-40 h-20">
        <svg viewBox="0 0 200 100" className="w-full h-full">
          {/* Background arc */}
          <path
            d="M 20 90 A 80 80 0 0 1 180 90"
            fill="none"
            stroke="#1e293b"
            strokeWidth="20"
            strokeLinecap="round"
          />
          {/* Colored arc */}
          <path
            d="M 20 90 A 80 80 0 0 1 180 90"
            fill="none"
            stroke={color}
            strokeWidth="20"
            strokeLinecap="round"
            strokeDasharray={`${(percentage / 100) * 251} 251`}
          />
          {/* Needle */}
          <line
            x1="100"
            y1="90"
            x2="100"
            y2="30"
            stroke="white"
            strokeWidth="3"
            strokeLinecap="round"
            transform={`rotate(${angle} 100 90)`}
          />
          {/* Center circle */}
          <circle cx="100" cy="90" r="8" fill="white" />
        </svg>
      </div>
      <div className="text-center mt-2">
        <div className="text-2xl font-bold" style={{ color }}>
          {value.toFixed(1)}
        </div>
        <div className="text-sm text-gray-400">{label}</div>
      </div>
    </div>
  );
}

export default GaugeChart;
