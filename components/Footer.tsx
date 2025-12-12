import React from 'react';
import { Mail } from 'lucide-react';

interface FooterProps {
  onOpenTerms: () => void;
  onOpenContact: () => void;
}

const Footer: React.FC<FooterProps> = ({ onOpenTerms, onOpenContact }) => {
  return (
    <footer className="bg-white border-t border-gray-200 mt-auto">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex flex-col items-center justify-center text-center space-y-6">
          
          {/* Contact Highlight */}
          <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 rounded-full text-blue-700 border border-blue-100">
             <Mail className="w-4 h-4" />
             <a href="mailto:ssc24x7@gmail.com" className="text-sm font-bold hover:underline">
               ssc24x7@gmail.com
             </a>
          </div>

          {/* Navigation Links */}
          <div className="flex flex-wrap justify-center gap-x-8 gap-y-2 text-sm font-semibold text-gray-600">
            <button onClick={onOpenTerms} className="hover:text-blue-600 transition-colors">
              Terms & Conditions
            </button>
            <button onClick={onOpenContact} className="hover:text-blue-600 transition-colors">
              Contact Us
            </button>
            <button onClick={onOpenTerms} className="hover:text-blue-600 transition-colors">
              Privacy Policy
            </button>
          </div>

          {/* Copyright */}
          <div className="text-xs text-gray-400 font-medium pt-4 border-t border-gray-100 w-full max-w-xs mx-auto">
            © {new Date().getFullYear()} SSC24x7. All rights reserved.
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;