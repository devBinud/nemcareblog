import React, { useEffect, useState } from 'react';
import { FaCheckCircle, FaTimesCircle, FaInfoCircle, FaTimes } from 'react-icons/fa';

const icons = {
  success: <FaCheckCircle className="text-green-500 text-xl shrink-0" />,
  error: <FaTimesCircle className="text-red-500 text-xl shrink-0" />,
  info: <FaInfoCircle className="text-blue-500 text-xl shrink-0" />,
};

const colors = {
  success: 'border-green-400 bg-green-50',
  error: 'border-red-400 bg-red-50',
  info: 'border-blue-400 bg-blue-50',
};

const Toast = ({ message, type = 'info', onClose }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Trigger enter animation
    const show = setTimeout(() => setVisible(true), 10);
    // Auto close after 3.5s
    const hide = setTimeout(() => {
      setVisible(false);
      setTimeout(onClose, 300);
    }, 3500);
    return () => { clearTimeout(show); clearTimeout(hide); };
  }, [onClose]);

  return (
    <div
      className={`flex items-start gap-3 border-l-4 rounded-lg shadow-lg px-4 py-3 max-w-sm w-full transition-all duration-300
        ${colors[type]}
        ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'}`}
    >
      {icons[type]}
      <p className="text-sm text-gray-700 font-medium flex-1">{message}</p>
      <button onClick={() => { setVisible(false); setTimeout(onClose, 300); }}
        className="text-gray-400 hover:text-gray-600 transition">
        <FaTimes />
      </button>
    </div>
  );
};

// Toast Container — place at top-right
export const ToastContainer = ({ toasts, removeToast }) => (
  <div className="fixed top-5 right-5 z-50 flex flex-col gap-3">
    {toasts.map((t) => (
      <Toast key={t.id} message={t.message} type={t.type} onClose={() => removeToast(t.id)} />
    ))}
  </div>
);

export default Toast;
