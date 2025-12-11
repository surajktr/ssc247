import React from 'react';

const Header: React.FC = () => {
  return (
    <header className="py-4 px-4 flex justify-center items-center border-b border-gray-100 bg-white sticky top-0 z-10 shadow-sm">
      <h1 className="text-xl font-extrabold tracking-tight text-blue-600 select-none">
        SSC 24x7
      </h1>
    </header>
  );
};

export default Header;