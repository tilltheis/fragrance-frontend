import { AuthForm } from './AuthForm';
import { useAuth } from './AuthProvider';
import { LoggedInLayout } from './LoggedInLayout';

export function App() {
  const auth = useAuth();

  if (auth.status === 'loggedIn') return <LoggedInLayout />;

  return <AuthForm />;
}
