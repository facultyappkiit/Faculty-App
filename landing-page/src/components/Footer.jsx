import React from 'react';
import { Github, Mail } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="bg-gray-900 text-gray-300 py-12 border-t border-gray-800">
      <div className="container px-4 mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-12">
          {/* Column 1 */}
          <div>
            <div className="flex items-center gap-2 mb-6">
              <div className="w-8 h-8 bg-kiit-green rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg leading-none">F</span>
              </div>
              <h3 className="text-xl font-bold text-white">FacultyApp</h3>
            </div>
            <p className="text-gray-400 mb-6 max-w-xs">
              A seamless platform for KIIT faculty to request and accept substitute duties.
            </p>
            <p className="text-sm text-gray-500">
              © {new Date().getFullYear()} KIIT University
            </p>
          </div>

          {/* Column 2 */}
          <div>
            <h4 className="text-lg font-bold text-white mb-6">Quick Links</h4>
            <ul className="space-y-4">
              <li><a href="#" className="hover:text-kiit-green transition-colors">Home</a></li>
              <li><a href="#how-it-works" className="hover:text-kiit-green transition-colors">How it Works</a></li>
              <li><a href="#download" className="hover:text-kiit-green transition-colors">Download</a></li>
              <li><a href="#" className="hover:text-kiit-green transition-colors">Privacy Policy</a></li>
              <li><a href="#" className="hover:text-kiit-green transition-colors">Terms of Service</a></li>
            </ul>
          </div>

          {/* Column 3 */}
          <div>
            <h4 className="text-lg font-bold text-white mb-6">Contact</h4>
            <ul className="space-y-4">
              <li>
                <a href="mailto:support@facultyapp.kiit.ac.in" className="flex items-center gap-3 hover:text-kiit-green transition-colors">
                  <Mail size={18} />
                  <span>support@facultyapp.kiit.ac.in</span>
                </a>
              </li>
              <li>
                <a href="#" className="flex items-center gap-3 hover:text-kiit-green transition-colors">
                  <Github size={18} />
                  <span>GitHub Repository</span>
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
