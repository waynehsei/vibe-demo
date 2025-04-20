import { useState, useEffect } from 'react';
import Cookies from 'js-cookie';

const CONVERSATION_ID_COOKIE = 'conversation_id';

export function useConversation() {
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initConversation = async () => {
      try {
        // Check for existing conversation ID in cookies
        const existingId = Cookies.get(CONVERSATION_ID_COOKIE);
        if (existingId) {
          setConversationId(existingId);
          setIsLoading(false);
          return;
        }

        // Create new conversation
        const response = await fetch('http://localhost:8000/v1/conversations', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            user_id: 'USER',
          }),
        });

        if (!response.ok) {
          throw new Error(`Failed to create conversation: ${response.statusText}`);
        }

        const data = await response.json();
        const newConversationId = data.conversation_id;

        // Store in cookies (expires in 30 days)
        Cookies.set(CONVERSATION_ID_COOKIE, newConversationId, { expires: 30 });
        setConversationId(newConversationId);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to initialize conversation');
      } finally {
        setIsLoading(false);
      }
    };

    initConversation();
  }, []);

  return { conversationId, isLoading, error };
} 