import * as React from 'react';
import { Box, Flex, Typography } from '@strapi/design-system';
import { Link as RouterLink } from 'react-router-dom';

// Small shared pieces for the WOA widgets and pages
export const Row = ({ children, to, href }: { children: React.ReactNode; to?: string; href?: string }) => {
  const inner = (
    <Flex gap={3} paddingTop={2} paddingBottom={2} paddingRight={2} justifyContent="space-between" alignItems="center" style={{ borderBottom: '1px solid rgba(128,128,140,.22)' }}>
      {children}
    </Flex>
  );
  if (to) return <RouterLink to={to} className="woa-row-link" style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>{inner}</RouterLink>;
  if (href) return <a href={href} target="_blank" rel="noreferrer" className="woa-row-link" style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>{inner}</a>;
  return inner;
};

export const Count = ({ n, tone = 'neutral' }: { n: number | string; tone?: 'neutral' | 'warning' | 'success' | 'danger' }) => {
  const c = { neutral: ['#f0f0ff', '#271fe0'], warning: ['#fdf4dc', '#a5671d'], success: ['#eafbe7', '#2f6846'], danger: ['#fcecea', '#b72b1a'] }[tone];
  return <span style={{ flex: 'none', whiteSpace: 'nowrap', display: 'inline-grid', placeItems: 'center', minWidth: 24, height: 24, padding: '0 8px', borderRadius: 12, background: c[0], color: c[1], fontWeight: 600, fontSize: 12, lineHeight: 1 }}>{n}</span>;
};

export const Dot = ({ ok }: { ok: boolean | null }) => (
  <span aria-hidden style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 4, background: ok === null ? '#a5a5ba' : ok ? '#328048' : '#d02b20', flex: 'none' }} />
);

export const Bar = ({ value, max, color = '#b6a67f' }: { value: number; max: number; color?: string }) => (
  <Box style={{ height: 8, width: '100%', background: 'rgba(128,128,140,.2)', borderRadius: 4, overflow: 'hidden' }}>
    <Box style={{ height: '100%', width: `${max ? Math.round((value / max) * 100) : 0}%`, background: color, borderRadius: 4, transition: 'width .3s' }} />
  </Box>
);

export const Muted = ({ children, block }: { children: React.ReactNode; block?: boolean }) => <Typography variant="pi" textColor="neutral600" style={block ? { display: 'block' } : undefined}>{children}</Typography>;

// hover for every clickable row (design rule: all links and cards have a hover state)
export const GlobalStyle = () => (
  <style>{`.woa-row-link:hover { background: rgba(128,128,140,.12); } .woa-row-link:focus-visible { outline: 2px solid #b6a67f; outline-offset: 2px; } .woa-bar rect:hover { fill: #8c7c55; } @media (prefers-reduced-motion: reduce) { .woa-anim { transition: none !important; } }`}</style>
);
