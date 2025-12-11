import React from 'react';

const Header: React.FC = () => {
  return (
    <header className="py-4 px-4 flex justify-center items-center border-b border-gray-100 bg-white sticky top-0 z-10 shadow-sm">
      <h1 className="text-xl font-extrabold tracking-tight text-gray-800 select-none">
        Dailygraph <span className="text-emerald-600">SSC 247</span>
      </h1>
    </header>
  );
};

export default Header;