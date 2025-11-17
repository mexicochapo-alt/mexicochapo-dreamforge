
import React from 'react';

export const Logo: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" {...props}>
    <defs>
      <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style={{ stopColor: '#818cf8', stopOpacity: 1 }} />
        <stop offset="100%" style={{ stopColor: '#c084fc', stopOpacity: 1 }} />
      </linearGradient>
    </defs>
    <path
      fill="url(#grad1)"
      d="M50 5 L95 27.5 L95 72.5 L50 95 L5 72.5 L5 27.5 Z M50 20 L25 33.75 L25 66.25 L50 80 L75 66.25 L75 33.75 Z"
    />
    <path
      fill="url(#grad1)"
      d="M50 30 L62.5 36.875 L62.5 50 L50 56.25 L37.5 50 L37.5 36.875 Z"
      transform="rotate(15 50 50)"
    />
    <path
      fill="rgba(255,255,255,0.8)"
      d="M50 42.5 L56.25 46.25 L50 50 L43.75 46.25 Z"
    />
  </svg>
);
