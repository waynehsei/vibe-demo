import { useState } from 'react';
import { Box } from '@mantine/core';
import { Sidebar } from './Sidebar';
import { ChatLayout } from './chat/ChatLayout';
import { SlackLayout } from './slack/SlackLayout';
import { MaterialLayout } from './material/MaterialLayout';
import { InsightLayout } from './insight/InsightLayout';

interface LayoutProps {
  userId: string;
  conversationId: string;
  onLogout: () => void;
}

export function Layout({ userId, conversationId, onLogout }: LayoutProps) {
  const [currentPath, setCurrentPath] = useState('/chat');

  const handleNavigate = (path: string) => {
    setCurrentPath(path);
  };

  const renderLayout = () => {
    switch (currentPath) {
      case '/slack':
        return <SlackLayout />;
      case '/materials':
        return <MaterialLayout />;
      case '/insights':
        return <InsightLayout />;
      case '/chat':
      default:
        return <ChatLayout 
          userId={userId} 
          conversationId={conversationId} 
          onLogout={onLogout} 
        />;
    }
  };

  return (
    <Box
      style={{
        display: 'flex',
        minHeight: '100vh',
      }}
    >
      <Sidebar 
        currentPath={currentPath} 
        onNavigate={handleNavigate} 
        onLogout={onLogout} 
      />
      <Box
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {renderLayout()}
      </Box>
    </Box>
  );
} 