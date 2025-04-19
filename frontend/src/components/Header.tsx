import { Box, Group, rem } from '@mantine/core';
import { IconBell, IconMoonStars, IconKey } from '@tabler/icons-react';

export function Header() {
  return (
    <Box
      component="header"
      style={{
        height: rem(56),
        paddingLeft: '1rem',
        paddingRight: '1rem',
        borderBottom: '1px solid var(--mantine-color-gray-2)',
      }}
    >
      <Box
        style={{
          height: rem(56),
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <a
          href="/"
          style={{
            fontWeight: 700,
            fontSize: rem(24),
            color: 'var(--mantine-color-black)',
            textDecoration: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: rem(8),
          }}
        >
          <img src="/logo.svg" alt="Logo" width={32} height={32} />
          drant
        </a>

        <Group gap={8}>
          {[IconBell, IconMoonStars, IconKey].map((Icon, index) => (
            <Box
              key={index}
              component="a"
              href="#"
              style={{
                width: rem(36),
                height: rem(36),
                borderRadius: rem(8),
                color: 'var(--mantine-color-gray-7)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background-color 150ms ease',
                ':hover': {
                  backgroundColor: 'var(--mantine-color-gray-0)',
                },
              }}
            >
              <Icon size="1.2rem" stroke={1.5} />
            </Box>
          ))}
        </Group>
      </Box>
    </Box>
  );
} 