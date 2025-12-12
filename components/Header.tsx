import React from 'react';
import { GraduationCap, BookOpen, Clock, Settings } from 'lucide-react';

const Header: React.FC = () => {
  return (
    <header className="py-3 px-4 flex justify-center items-center border-b border-gray-200 bg-white sticky top-0 z-20 shadow-sm backdrop-blur-md bg-white/95">
      <div className="flex items-center gap-3">
        {/* Logo Graphic - Circular Design */}
        <div className="relative w-14 h-14 flex items-center justify-center bg-blue-600 rounded-full border-[3px] border-blue-800 shadow-md overflow-hidden group shrink-0">
            {/* Background Gradient */}
            <div className="absolute inset-0 bg-gradient-to-b from-blue-700 to-blue-900"></div>
            
            {/* Inner Ring Effect */}
            <div className="absolute inset-0 border-2 border-white/20 rounded-full m-0.5"></div>

            {/* Composite Icon */}
            <div className="relative z-10 flex flex-col items-center justify-center -mt-0.5">
                 {/* Graduation Cap */}
                 <GraduationCap className="w-6 h-6 text-white drop-shadow-md relative z-10 -mb-1.5" strokeWidth={2.5} />
                 
                 {/* Open Book */}
                 <BookOpen className="w-7 h-7 text-blue-100 drop-shadow-sm" strokeWidth={2} />
                 
                 {/* Clock Overlay (Centered on Book) */}
                 <div className="absolute top-[55%] left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-full p-[1px] shadow-sm border border-blue-200">
                    <Clock className="w-3 h-3 text-orange-500" strokeWidth={3} />
                 </div>
            </div>
            
             {/* Decorative Gears (Subtle background elements) */}
            <Settings className="absolute top-2 right-1.5 w-3 h-3 text-blue-300/30 rotate-12" />
            <Settings className="absolute bottom-2.5 left-2 w-2.5 h-2.5 text-blue-300/30 -rotate-12" />
        </div>

        {/* Text Logo */}
        <div className="flex flex-col justify-center">
          <h1 className="text-2xl font-extrabold tracking-tight text-blue-900 leading-none flex items-center">
            SSC<span className="text-blue-600">24x7</span>
          </h1>
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest leading-none mt-1">
            Your Guide to Success
          </p>
        </div>
      </div>
    </header>
  );
};

export default Header;