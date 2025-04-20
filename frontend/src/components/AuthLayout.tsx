import { useState } from 'react';
import { Box, Paper, Text, TextInput, PasswordInput, Button, Group, Divider, Alert, rem, Tabs, Loader } from '@mantine/core';
import { IconAlertCircle, IconLogin, IconUserPlus } from '@tabler/icons-react';

interface AuthLayoutProps {
  onLogin: (userId: string, password: string) => Promise<{ success: boolean; error?: string }>;
  onRegister: (userId: string, password: string) => Promise<{ success: boolean; error?: string }>;
  isLoading: boolean;
}

export function AuthLayout({ onLogin, onRegister, isLoading }: AuthLayoutProps) {
  const [activeTab, setActiveTab] = useState<string | null>('login');
  const [loginUserId, setLoginUserId] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [registerUserId, setRegisterUserId] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    if (!loginUserId.trim() || !loginPassword) {
      setError('Please enter both User ID and Password');
      return;
    }

    setError(null);
    const result = await onLogin(loginUserId, loginPassword);
    if (!result.success) {
      setError(result.error || 'Login failed');
    }
  };

  const handleRegister = async () => {
    if (!registerUserId.trim() || !registerPassword) {
      setError('Please enter both User ID and Password');
      return;
    }

    if (registerUserId.length < 3) {
      setError('User ID must be at least 3 characters');
      return;
    }

    if (registerPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setError(null);
    const result = await onRegister(registerUserId, registerPassword);
    if (!result.success) {
      setError(result.error || 'Registration failed');
    }
  };

  return (
    <Box
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        padding: rem(16),
        backgroundColor: 'var(--mantine-color-gray-0)',
      }}
    >
      <Paper
        shadow="md"
        p="xl"
        style={{
          width: '100%',
          maxWidth: rem(400),
        }}
      >
        <Text size="xl" fw={700} ta="center" mb="lg">
          Chat Assistant
        </Text>
        
        {error && (
          <Alert icon={<IconAlertCircle size="1rem" />} color="red" mb="md" withCloseButton onClose={() => setError(null)}>
            {error}
          </Alert>
        )}
        
        <Tabs value={activeTab} onChange={setActiveTab}>
          <Tabs.List grow mb="md">
            <Tabs.Tab value="login" leftSection={<IconLogin size="0.8rem" />}>
              Login
            </Tabs.Tab>
            <Tabs.Tab value="register" leftSection={<IconUserPlus size="0.8rem" />}>
              Register
            </Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="login">
            <TextInput
              label="User ID"
              placeholder="Enter your user ID"
              value={loginUserId}
              onChange={(event) => setLoginUserId(event.currentTarget.value)}
              disabled={isLoading}
              mb="md"
              required
            />
            
            <PasswordInput
              label="Password"
              placeholder="Enter your password"
              value={loginPassword}
              onChange={(event) => setLoginPassword(event.currentTarget.value)}
              disabled={isLoading}
              mb="md"
              required
            />
            
            <Button
              fullWidth
              onClick={handleLogin}
              disabled={isLoading}
              mb="md"
            >
              {isLoading ? <Loader size="sm" color="white" /> : 'Login'}
            </Button>
          </Tabs.Panel>

          <Tabs.Panel value="register">
            <TextInput
              label="User ID"
              placeholder="Choose a user ID (min 3 characters)"
              value={registerUserId}
              onChange={(event) => setRegisterUserId(event.currentTarget.value)}
              disabled={isLoading}
              mb="md"
              required
            />
            
            <PasswordInput
              label="Password"
              placeholder="Choose a password (min 6 characters)"
              value={registerPassword}
              onChange={(event) => setRegisterPassword(event.currentTarget.value)}
              disabled={isLoading}
              mb="md"
              required
            />
            
            <Button
              fullWidth
              onClick={handleRegister}
              disabled={isLoading}
              mb="md"
              variant="filled"
              color="green"
            >
              {isLoading ? <Loader size="sm" color="white" /> : 'Create Account'}
            </Button>
          </Tabs.Panel>
        </Tabs>
        
        <Text size="xs" c="dimmed" ta="center">
          Your session will expire after 60 minutes of inactivity.
        </Text>
      </Paper>
    </Box>
  );
} 