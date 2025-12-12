import React from 'react';

const Header: React.FC = () => {
  return (
    <header className="py-2 px-4 flex justify-center items-center border-b border-gray-200 bg-white sticky top-0 z-20 shadow-sm backdrop-blur-md bg-white/95">
      <div className="flex items-center gap-2.5">
        {/* Logo Image */}
        <img 
          src="https://cdwikwwpakmlauiddasz.supabase.co/storage/v1/object/public/question-images/Gemini_Generated_Image_1dqfda1dqfda1dqf.png" 
          alt="SSC24x7 Logo" 
          className="w-10 h-10 object-contain shrink-0"
        />

        {/* Text Logo */}
        <div className="flex flex-col justify-center">
          <h1 className="text-xl font-extrabold tracking-tight text-blue-900 leading-none flex items-center">
            SSC<span className="text-blue-600">24x7</span>
          </h1>
        </div>
      </div>
    </header>
  );
};

export default Header;