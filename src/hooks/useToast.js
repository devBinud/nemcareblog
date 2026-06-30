import { useCallback } from 'react';
import Swal from 'sweetalert2';

const useToast = () => {
  const success = useCallback((msg) => {
    Swal.fire({
      title: 'Success!',
      text: msg,
      icon: 'success',
      confirmButtonColor: '#960c0c'
    });
  }, []);

  const error = useCallback((msg) => {
    Swal.fire({
      title: 'Error!',
      text: msg,
      icon: 'error',
      confirmButtonColor: '#960c0c'
    });
  }, []);

  const info = useCallback((msg) => {
    Swal.fire({
      title: 'Notification',
      text: msg,
      icon: 'info',
      confirmButtonColor: '#960c0c'
    });
  }, []);

  return { toasts: [], removeToast: () => {}, success, error, info };
};

export default useToast;

