import { IconRocket, IconPhoto, IconNotes, IconBulb, IconLink, IconKey, IconMessage, IconBrandSlack, IconFiles, IconChartBar } from '@tabler/icons-react';
import { Box, rem } from '@mantine/core';

interface NavItem {
  icon: typeof IconRocket;
  label: string;
  path: string;
}

const navItems: NavItem[] = [
  { icon: IconMessage, label: 'Chat', path: '/chat' },
  { icon: IconBrandSlack, label: 'Slack', path: '/slack' },
  { icon: IconFiles, label: 'Materials', path: '/materials' },
  { icon: IconChartBar, label: 'Insights', path: '/insights' },
];

interface SidebarProps {
  currentPath: string;
  onNavigate: (path: string) => void;
}

export function Sidebar({ currentPath, onNavigate }: SidebarProps) {
  return (
    <Box
      component="nav"
      style={{
        backgroundColor: 'var(--mantine-color-white)',
        paddingBottom: 0,
        height: '100vh',
        width: rem(60),
      }}
    >
      <Box
        style={{
          marginLeft: rem(-8),
          marginRight: rem(-8),
          height: '100%',
        }}
      >
        <Box
          style={{
            paddingTop: rem(20),
            paddingBottom: rem(20),
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: rem(4),
          }}
        >
          {navItems.map((item) => (
            <Box
              key={item.label}
              component="a"
              href="#"
              onClick={(event) => {
                event.preventDefault();
                onNavigate(item.path);
              }}
              style={{
                width: rem(44),
                height: rem(44),
                borderRadius: rem(8),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--mantine-color-gray-7)',
                transition: 'all 150ms ease',
                ':hover': {
                  backgroundColor: 'var(--mantine-color-gray-0)',
                },
                ...(currentPath === item.path && {
                  backgroundColor: 'var(--mantine-primary-color-light)',
                  color: 'var(--mantine-primary-color)',
                  ':hover': {
                    backgroundColor: 'var(--mantine-primary-color-light)',
                  },
                }),
              }}
            >
              <item.icon size="1.2rem" stroke={1.5} />
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  );
} 