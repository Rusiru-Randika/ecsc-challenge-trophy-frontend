import { Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import axios from 'axios';

const ProtectedRoute = ({ children }) => {
  const [isValid, setIsValid] = useState(null);
  const token = localStorage.getItem('token');

  useEffect(() => {
    const verifyToken = async () => {
      if (!token) {
        setIsValid(false);
        return;
      }

      try {
        const response = await axios.get('/api/auth/verify', {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (response.data.valid) {
          setIsValid(true);
        } else {
          localStorage.removeItem('token');
          setIsValid(false);
        }
      } catch (error) {
        // Token invalid - clear it
        localStorage.removeItem('token');
        setIsValid(false);
      }
    };

    verifyToken();
  }, [token]);

  if (isValid === null) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isValid) {
    return <Navigate to="/admin/login" replace />;
  }

  return children;
};

export default ProtectedRoute;

