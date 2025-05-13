import React from 'react';
import { FaHospitalAlt } from 'react-icons/fa';

const NotFound = () => {
  return (
    <div className="h-[70vh] flex flex-col justify-center items-center px-4 text-center">
      <FaHospitalAlt className="text-red-500 text-5xl animate-bounce mb-3" />
      <h1 className="text-2xl md:text-3xl font-semibold text-gray-800">
        404 - Page Not Found
      </h1>
      <p className="text-gray-600 mt-2 max-w-md">
        Sorry, we couldn’t find the page you’re looking for in the hospital system.
      </p>
    </div>
  );
};

export default NotFound;
