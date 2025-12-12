import React from 'react';
import { X, Mail, FileText, Phone, MapPin } from 'lucide-react';

interface InfoPageProps {
  type: 'terms' | 'contact';
  onClose: () => void;
}

export const InfoPage: React.FC<InfoPageProps> = ({ type, onClose }) => {
  return (
    <div className="fixed inset-0 z-[1300] bg-white flex flex-col animate-in slide-in-from-bottom-10 duration-300">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between bg-white shrink-0 sticky top-0 z-10">
        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          {type === 'terms' ? <FileText className="w-5 h-5 text-blue-600" /> : <Mail className="w-5 h-5 text-blue-600" />}
          {type === 'terms' ? 'Terms & Conditions' : 'Contact Us'}
        </h2>
        <button 
          onClick={onClose}
          className="p-2 rounded-full hover:bg-gray-100 text-gray-500 transition-colors"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-5 sm:p-8">
        <div className="max-w-2xl mx-auto prose prose-blue prose-sm sm:prose-base">
          
          {type === 'terms' && (
            <div className="space-y-6 text-gray-700">
              <section>
                <h3 className="text-xl font-bold text-gray-900 mb-2">1. Introduction</h3>
                <p>
                  Welcome to SSC24x7. By accessing and using this website/application, you accept and agree to be bound by the terms and provision of this agreement. In addition, when using these particular services, you shall be subject to any posted guidelines or rules applicable to such services.
                </p>
              </section>

              <section>
                <h3 className="text-xl font-bold text-gray-900 mb-2">2. Content & Intellectual Property</h3>
                <p>
                  All content provided on this application is for informational and educational purposes only. The owner of this application makes no representations as to the accuracy or completeness of any information on this site or found by following any link on this site.
                </p>
                <p>
                    The intellectual property of the quizzes, current affairs data, and aggregated content belongs to SSC24x7 unless otherwise stated.
                </p>
              </section>

              <section>
                <h3 className="text-xl font-bold text-gray-900 mb-2">3. User Conduct</h3>
                <p>
                  You agree to use the application only for lawful purposes. You are prohibited from violating or attempting to violate the security of the application, including, without limitation, accessing data not intended for you or logging into a server or account which you are not authorized to access.
                </p>
              </section>

              <section>
                <h3 className="text-xl font-bold text-gray-900 mb-2">4. Disclaimer</h3>
                <p>
                  The materials on SSC24x7's application are provided on an 'as is' basis. SSC24x7 makes no warranties, expressed or implied, and hereby disclaims and negates all other warranties including, without limitation, implied warranties or conditions of merchantability, fitness for a particular purpose, or non-infringement of intellectual property or other violation of rights.
                </p>
              </section>
            </div>
          )}

          {type === 'contact' && (
            <div className="space-y-8">
              <div className="bg-blue-50 rounded-2xl p-6 border border-blue-100 text-center">
                 <h3 className="text-lg font-bold text-gray-900 mb-2">Get in Touch</h3>
                 <p className="text-gray-600 mb-6">Have questions about our content or found a bug? We'd love to hear from you.</p>
                 
                 <a 
                   href="mailto:ssc24x7@gmail.com" 
                   className="inline-flex items-center justify-center px-6 py-3 bg-blue-600 text-white font-bold rounded-xl shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all active:scale-95"
                 >
                   <Mail className="w-5 h-5 mr-2" /> Email Us Now
                 </a>
              </div>

              <div className="grid grid-cols-1 gap-4">
                 <div className="flex items-start p-4 bg-white border border-gray-100 rounded-xl shadow-sm">
                    <div className="bg-gray-100 p-2 rounded-lg text-gray-600 mr-4">
                        <Mail className="w-5 h-5" />
                    </div>
                    <div>
                        <h4 className="font-bold text-gray-900">Email</h4>
                        <p className="text-gray-600 text-sm">ssc24x7@gmail.com</p>
                        <p className="text-xs text-gray-400 mt-1">Response time: Within 24 hours</p>
                    </div>
                 </div>
                 
                 <div className="flex items-start p-4 bg-white border border-gray-100 rounded-xl shadow-sm opacity-60">
                    <div className="bg-gray-100 p-2 rounded-lg text-gray-600 mr-4">
                        <MapPin className="w-5 h-5" />
                    </div>
                    <div>
                        <h4 className="font-bold text-gray-900">Location</h4>
                        <p className="text-gray-600 text-sm">Digital Only</p>
                        <p className="text-xs text-gray-400 mt-1">Based in India</p>
                    </div>
                 </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};