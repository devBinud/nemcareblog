import React from 'react';

const Footer = () => {
  return (
    <div className="text-center text-xs text-slate-400 py-6 border-t border-slate-100 bg-white">
      © {new Date().getFullYear()} <a href="https://www.nemcare.com/" target="_blank" rel="noopener noreferrer" className="font-semibold text-slate-500 hover:text-[#960c0c] hover:underline">Nemcare Hospital</a> · All rights reserved.
    </div>
  );
};

export default Footer;
