import React from 'react';

export const Loader = ({ text = "Yuklanmoqda...", variant = "inline", colSpan = 1 }) => {
  // variants: "fullscreen", "block", "table", "inline"
  
  if (variant === "fullscreen") {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-md transition-all duration-300">
        {/* Glow Effects */}
        <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        
        <div className="relative flex flex-col items-center p-8 rounded-3xl bg-slate-900/60 border border-slate-800 shadow-2xl backdrop-blur-xl max-w-sm w-full mx-4">
          {/* Animated Interactive Spinner */}
          <div className="relative w-24 h-24 mb-6">
            {/* Outer Spinning Ring */}
            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-blue-500 border-r-indigo-500 animate-spin" style={{ animationDuration: '1.2s' }}></div>
            {/* Inner Counter-spinning Ring */}
            <div className="absolute inset-2 rounded-full border-4 border-transparent border-b-purple-500 border-l-pink-500 animate-spin" style={{ animationDuration: '1.8s', animationDirection: 'reverse' }}></div>
            {/* Core Glowing Dot */}
            <div className="absolute inset-6 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-500 flex items-center justify-center shadow-lg shadow-indigo-500/50">
              <svg className="w-6 h-6 text-white animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
          </div>
          
          {/* Pulsating Text */}
          <h3 className="text-lg font-bold text-white text-center tracking-wide animate-pulse">
            {text}
          </h3>
          <p className="text-xs text-slate-400 mt-2 text-center">
            Tizim ma'lumotlari xavfsiz yuklanmoqda
          </p>
          
          {/* Interactive Dynamic Dots */}
          <div className="flex items-center gap-1.5 mt-4">
            <span className="w-2.5 h-2.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
            <span className="w-2.5 h-2.5 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
            <span className="w-2.5 h-2.5 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
          </div>
        </div>
      </div>
    );
  }

  if (variant === "block") {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-6 bg-gradient-to-br from-white to-slate-50/50 border border-slate-200/80 rounded-2xl shadow-sm transition-all duration-300 w-full">
        <div className="relative w-16 h-16 mb-4">
          <div className="absolute inset-0 rounded-full border-4 border-slate-100"></div>
          <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-blue-600 animate-spin"></div>
          <div className="absolute inset-3 bg-blue-50 rounded-full flex items-center justify-center">
            <div className="w-2.5 h-2.5 bg-blue-600 rounded-full animate-ping"></div>
          </div>
        </div>
        <div className="text-slate-700 font-bold text-center tracking-medium animate-pulse">
          {text}
        </div>
        <div className="text-xs text-slate-400 mt-1.5 text-center">Iltimos, kuting...</div>
      </div>
    );
  }

  if (variant === "table") {
    return (
      <tr>
        <td colSpan={colSpan} className="px-6 py-12 text-center">
          <div className="flex flex-col items-center justify-center gap-3">
            <div className="relative flex items-center justify-center w-10 h-10">
              {/* Spinning gradient border */}
              <div className="absolute inset-0 rounded-full border-2 border-slate-100"></div>
              <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-indigo-600 border-r-indigo-600 animate-spin"></div>
              {/* Small center dot */}
              <div className="w-2 h-2 bg-indigo-600 rounded-full animate-pulse"></div>
            </div>
            <span className="text-sm font-semibold text-slate-500 tracking-wide animate-pulse">
              {text}
            </span>
          </div>
        </td>
      </tr>
    );
  }

  // Default: inline / small
  return (
    <div className="flex items-center justify-center gap-3 py-6 text-slate-500 w-full">
      <div className="relative w-6 h-6">
        <div className="absolute inset-0 rounded-full border-2 border-slate-200"></div>
        <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-blue-600 animate-spin"></div>
      </div>
      <span className="text-sm font-medium tracking-medium animate-pulse">{text}</span>
    </div>
  );
};
