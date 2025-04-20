import { useState, useEffect } from 'react';
import Cookies from 'js-cookie';
import { notifications } from '@mantine/notifications';

const USER_ID_COOKIE = 'user_id';
const CONVERSATION_ID_COOKIE = 'conversation_id';
const COOKIE_EXPIRY = 1/24; // 60 minutes (1/24 of a day)

interface AuthState {
  userId: string | null;
  conversationId: string | null;
  isAuthenticated: boolean;
}

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    userId: null,
    conversationId: null,
    isAuthenticated: false,
  });
  const [isLoading, setIsLoading] = useState(true);

  // Check cookies on initial load
  useEffect(() => {
    const userId = Cookies.get(USER_ID_COOKIE);
    const conversationId = Cookies.get(CONVERSATION_ID_COOKIE);
    
    if (userId && conversationId) {
      setAuthState({
        userId,
        conversationId,
        isAuthenticated: true,
      });
    }
    
    setIsLoading(false);
  }, []);

  const register = async (userId: string, password: string) => {
    setIsLoading(true);
    try {
      const response = await fetch('http://localhost:8000/v1/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: userId,
          password: password,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Registration failed');
      }

      const data = await response.json();
      
      // Save to cookies (expires in 60 minutes)
      Cookies.set(USER_ID_COOKIE, data.user_id, { expires: COOKIE_EXPIRY });
      Cookies.set(CONVERSATION_ID_COOKIE, data.conversation_id, { expires: COOKIE_EXPIRY });

      setAuthState({
        userId: data.user_id,
        conversationId: data.conversation_id,
        isAuthenticated: true,
      });
      
      notifications.show({
        title: 'Success',
        message: 'Registration successful!',
        color: 'green',
      });
      
      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Registration failed';
      
      notifications.show({
        title: 'Error',
        message: errorMessage,
        color: 'red',
      });
      
      return { 
        success: false, 
        error: errorMessage
      };
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (userId: string, password: string) => {
    setIsLoading(true);
    try {
      const response = await fetch('http://localhost:8000/v1/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: userId,
          password: password,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Login failed');
      }

      const data = await response.json();

      // Save to cookies (expires in 60 minutes)
      Cookies.set(USER_ID_COOKIE, data.user_id, { expires: COOKIE_EXPIRY });
      Cookies.set(CONVERSATION_ID_COOKIE, data.conversation_id, { expires: COOKIE_EXPIRY });

      setAuthState({
        userId: data.user_id,
        conversationId: data.conversation_id,
        isAuthenticated: true,
      });
      
      notifications.show({
        title: 'Success',
        message: 'Login successful!',
        color: 'green',
      });
      
      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Login failed';
      
      notifications.show({
        title: 'Error',
        message: errorMessage,
        color: 'red',
      });
      
      return { 
        success: false, 
        error: errorMessage
      };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    Cookies.remove(USER_ID_COOKIE);
    Cookies.remove(CONVERSATION_ID_COOKIE);
    setAuthState({
      userId: null,
      conversationId: null,
      isAuthenticated: false,
    });
    
    notifications.show({
      title: 'Logged Out',
      message: 'You have been logged out.',
      color: 'blue',
    });
  };

  return {
    ...authState,
    isLoading,
    register,
    login,
    logout,
  };
} 