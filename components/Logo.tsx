import React from 'react';

export const Logo: React.FC<{ className?: string, showText?: boolean }> = ({ className = "w-24 h-24", showText = true }) => {
  return (
    <div className={`flex flex-col items-center ${className}`}>
      <svg viewBox="0 0 200 250" className="w-full h-full drop-shadow-lg" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="gradBrazil" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style={{ stopColor: '#009c3b', stopOpacity: 1 }} /> {/* Green */}
            <stop offset="50%" style={{ stopColor: '#ffdf00', stopOpacity: 1 }} /> {/* Yellow */}
            <stop offset="100%" style={{ stopColor: '#002776', stopOpacity: 1 }} /> {/* Blue */}
          </linearGradient>
        </defs>
        
        {/* Water Drop Shape */}
        <path 
          d="M100 10 
             C60 80 20 100 20 160 
             A80 80 0 1 0 180 160 
             C180 100 140 80 100 10 Z" 
          fill="url(#gradBrazil)" 
          stroke="white" 
          strokeWidth="4"
        />
        
        {/* Inner Water Bubbles */}
        <circle cx="100" cy="160" r="45" fill="#002776" stroke="white" strokeWidth="3" />
        <circle cx="85" cy="150" r="8" fill="white" fillOpacity="0.8" />
        <circle cx="115" cy="155" r="6" fill="white" fillOpacity="0.8" />
        <circle cx="100" cy="175" r="10" fill="white" fillOpacity="0.8" />
      </svg>
      
      {showText && (
        <div className="text-center mt-2">
          <h1 className="font-black text-3xl tracking-tighter text-[#002776] leading-none">
            H2<span className="text-[#009c3b]">BRASIL</span>
          </h1>
          <p className="text-[#ffdf00] font-bold text-sm tracking-widest bg-[#002776] px-2 rounded-full mt-1">
            DISTRIBUIDORA
          </p>
        </div>
      )}
    </div>
  );
};