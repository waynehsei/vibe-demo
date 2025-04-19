import { useState } from 'react';
import { Box } from '@mantine/core';
import { Sidebar } from './Sidebar';
import { ChatLayout } from './ChatLayout';
import { SlackLayout } from './slack/SlackLayout';
import { MaterialLayout } from './material/MaterialLayout';
import { InsightLayout } from './insight/InsightLayout';

export function Layout() {
  const [currentPath, setCurrentPath] = useState('/');

  const handleNavigate = (path: string) => {
    setCurrentPath(path);
  };

  return (
    <Box
      style={{
        display: 'flex',
        minHeight: '100vh',
      }}
    >
      <Sidebar currentPath={currentPath} onNavigate={handleNavigate} />
      <Box
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {currentPath === '/chat' && <ChatLayout />}
        {currentPath === '/slack' && <SlackLayout />}
        {currentPath === '/materials' && <MaterialLayout />}
        {currentPath === '/insights' && <InsightLayout />}
      </Box>
    </Box>
  );
} 