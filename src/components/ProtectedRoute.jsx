import { Outlet } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';

export default function ProtectedRoute({ unauthenticatedElement = null }) {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <Outlet /> : unauthenticatedElement;
}
