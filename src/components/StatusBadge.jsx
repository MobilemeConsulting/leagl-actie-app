import React from 'react';

// Map each status value to a Tailwind colour combination
const STATUS_STYLES = {
  Open: 'bg-blue-100 text-blue-800 border-blue-200',
  'In Progress': 'bg-yellow-100 text-yellow-800 border-yellow-200',
  Completed: 'bg-green-100 text-green-800 border-green-200',
};

// Fallback style for unknown status values
const DEFAULT_STYLE = 'bg-gray-100 text-gray-700 border-gray-200';

/**
 * Pill badge that shows the action status with a colour-coded background.
 * Props:
 *   status — one of 'Open', 'In Progress', 'Completed'
 */
export default function StatusBadge({ status }) {
  const style = STATUS_STYLES[status] || DEFAULT_STYLE;

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${style}`}
    >
      {status}
    </span>
  );
}
