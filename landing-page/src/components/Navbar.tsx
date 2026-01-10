import React from 'react';

const Navbar: React.FC = () => {
  return (
    <nav className="absolute top-0 left-0 w-full z-50 px-6 md:px-12 py-8">
      <div className="flex items-center justify-between max-w-screen-2xl mx-auto">
        {/* Logo - Playfair Display (Display Serif) */}
        <div className="flex items-center cursor-pointer select-none group">
          <span className="text-3xl font-display tracking-tight text-white font-medium group-hover:text-accent transition-colors duration-300">
            Sentric
          </span>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;