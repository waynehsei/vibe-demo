import { MantineProvider } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { useAuth } from './hooks/useAuth';
import { AuthLayout } from './components/AuthLayout';
import { Layout } from './components/Layout';
import '@mantine/notifications/styles.css';

export default function App() {
  const { isAuthenticated, userId, conversationId, isLoading, login, register, logout } = useAuth();

  return (
    <MantineProvider
      theme={{
        primaryColor: 'blue',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
      }}
    >
      <Notifications />
      {isAuthenticated && userId && conversationId ? (
        <Layout 
          userId={userId} 
          conversationId={conversationId}
          onLogout={logout}
        />
      ) : (
        <AuthLayout 
          onLogin={login} 
          onRegister={register} 
          isLoading={isLoading} 
        />
      )}
    </MantineProvider>
  );
}
