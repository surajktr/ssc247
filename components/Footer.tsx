import React from 'react';

interface FooterProps {
  onOpenTerms: () => void;
  onOpenContact: () => void;
}

const Footer: React.FC<FooterProps> = ({ onOpenTerms, onOpenContact }) => {
  return (
    <footer className="bg-white border-t border-gray-200 mt-auto">
      <div className="max-w-6xl mx-auto px-4 py-4">
        <div className="flex flex-col items-center justify-center text-center space-y-3">
          
          {/* Navigation Links */}
          <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs font-semibold text-gray-500">
            <button onClick={onOpenTerms} className="hover:text-blue-600 transition-colors">
              Terms & Conditions
            </button>
            <span className="text-gray-300">•</span>
            <button onClick={onOpenContact} className="hover:text-blue-600 transition-colors">
              Contact Us
            </button>
            <span className="text-gray-300">•</span>
            <button onClick={onOpenTerms} className="hover:text-blue-600 transition-colors">
              Privacy Policy
            </button>
          </div>

          {/* Copyright */}
          <div className="text-[10px] text-gray-400 font-medium pt-2 border-t border-gray-100 w-full max-w-[200px] mx-auto">
            © {new Date().getFullYear()} SSC24x7. All rights reserved.
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;