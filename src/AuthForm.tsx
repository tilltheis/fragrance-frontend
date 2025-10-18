import { useState } from 'react';
import { useAuth, type LoggedInAuth, type LoggedOutAuth } from './AuthProvider';

type LoginFormProps = {
  auth: LoggedOutAuth;
};

function LoginForm({ auth }: LoginFormProps) {
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [isError, setIsError] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await auth.login({ username, password });
    if (!success) {
      setIsError(true);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-bg-base">
      <h1 className="text-2xl mb-4 text-fg-base">Login</h1>
      <form className="bg-card-bg p-6 rounded-lg shadow-lg w-80 border border-card-border text-card-fg">
        <div className="mb-6">
          <label className="block text-fg-base text-sm font-bold mb-2" htmlFor="username">
            Username
          </label>
          <input
            className={`
              text-input-fg
              bg-input-bg
              border
              rounded
              border-input-border
              hover:border-input-hover-border
              w-full
              py-2
              px-3
              text-fg-base
              leading-tight
              focus:border-input-focus-border
              focus:outline-focus-ring
              focus-visible:ring-2
              focus-visible:ring-focus-ring
              focus-visible:ring-offset-1
              ${isError ? 'border-input-invalid-border' : ''}
              `}
            id="username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </div>
        <div className="mb-6">
          <label className="block text-fg-base text-sm font-bold mb-2" htmlFor="password">
            Password
          </label>
          <input
            className={`
              text-input-fg
              bg-input-bg
              border
              rounded
              border-input-border
              hover:border-input-hover-border
              w-full
              py-2
              px-3
              text-fg-base
              leading-tight
              focus:border-input-focus-border
              focus:outline-focus-ring
              focus-visible:ring-2
              focus-visible:ring-focus-ring
              focus-visible:ring-offset-1
              ${isError ? 'border-input-invalid-border' : ''}
              `}
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <div className="flex items-center justify-between">
          <button
            className="
              bg-button-primary-fill
              hover:bg-button-primary-hover
              active:bg-button-primary-active
              text-button-primary-fg
              border
              border-button-primary-border
              rounded
              font-bold
              py-2
              px-4
              rounded
              focus:outline-none
              focus:shadow-outline
              focus:outline-none
              focus-visible:ring-2 focus-visible:ring-focus-ring
              focus-visible:ring-offset-2
              ring-offset-card-bg
              "
            type="button"
            onClick={handleSubmit}
          >
            Log In
          </button>
        </div>
      </form>
    </div>
  );
}

type LogoutFormProps = {
  auth: LoggedInAuth;
};

function LogoutForm({ auth }: LogoutFormProps) {
  return (
    <div className="text-fg-base">
      <button
        className="
          w-30
          h-8
          font-bold
          bg-button-secondary-fill
          hover:bg-button-secondary-hover
          active:bg-button-secondary-active
          text-button-secondary-fg
          border
          border-button-secondary-border
          rounded
          focus:outline-none
          focus:shadow-outline
          focus:outline-none
          focus-visible:ring-2
          focus-visible:ring-focus-ring
          focus-visible:ring-offset-2
          ring-offset-card-bg
          "
        onClick={() => auth.logout()}
      >
        Log out
      </button>
    </div>
  );
}

export function AuthForm() {
  const auth = useAuth();

  switch (auth.status) {
    case 'loggedIn':
      return <LogoutForm auth={auth} />;
    case 'loggedOut':
      return <LoginForm auth={auth} />;
    default: {
      const _exhaustive: never = auth;
      return _exhaustive;
    }
  }
}
