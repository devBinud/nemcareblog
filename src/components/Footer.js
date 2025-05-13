import React from 'react';

const Footer = () => {
  return (
    <div className="bg-gray-100 text-center text-sm text-gray-600 py-3 shadow-inner">
      © {new Date().getFullYear()} <a href="https://www.nemcare.com/" target="_blank" rel="noopener noreferrer" className="font-bold text-gray-700 hover:underline">Nemcare Hospital</a> · All rights reserved.
    </div>
  );
};

export default Footer;
