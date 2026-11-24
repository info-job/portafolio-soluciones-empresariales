
import React from 'react';

interface NewIndicatorProps {
  timestamp: number;
  thresholdMinutes?: number;
}

const NewIndicator: React.FC<NewIndicatorProps> = ({ timestamp, thresholdMinutes = 10 }) => {
  const isNew = Date.now() - timestamp < thresholdMinutes * 60 * 1000;
  
  if (!isNew) return null;
  
  return (
    <div className="absolute top-0 left-0 w-1.5 h-1.5 bg-blue-500 rounded-full -translate-x-1/2 -translate-y-1/2 shadow-sm animate-pulse" title="Registro Nuevo" />
  );
};

export default NewIndicator;
