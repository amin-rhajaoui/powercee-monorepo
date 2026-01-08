/**
 * Configuration de thème Gluestack UI basée sur les couleurs du web
 * Utilisation de tokens similaires à shadcn/ui
 */

import { createConfig } from '@gluestack-ui/themed';

const config = createConfig({
  tokens: {
    colors: {
      // Primary colors (rouge foncé du web)
      primary0: '#FFFFFF',
      primary50: '#FEF2F2',
      primary100: '#FEE2E2',
      primary200: '#FECACA',
      primary300: '#FCA5A5',
      primary400: '#F87171',
      primary500: '#8B1A2B', // Couleur principale
      primary600: '#7A1727',
      primary700: '#691423',
      primary800: '#58111F',
      primary900: '#470E1B',
      primary950: '#360B15',

      // Background colors
      background0: '#FFFFFF',
      background50: '#F5F7FA', // Background principal
      background100: '#F0F3F6',
      background200: '#E5E9F0',
      background300: '#CBD5E1',
      background400: '#94A3B8',
      background500: '#64748B',
      background600: '#475569',
      background700: '#334155',
      background800: '#1E293B',
      background900: '#0F172A',
      background950: '#020617',

      // Text colors
      text0: '#FFFFFF',
      text50: '#F5F7FA',
      text100: '#E5E9F0',
      text200: '#CBD5E1',
      text300: '#94A3B8',
      text400: '#64748B',
      text500: '#475569',
      text600: '#334155',
      text700: '#1E293B',
      text800: '#1A1F2E', // Foreground principal
      text900: '#0F172A',
      text950: '#020617',

      // Border colors
      border0: '#FFFFFF',
      border50: '#F5F7FA',
      border100: '#E5E9F0', // Border principal
      border200: '#CBD5E1',
      border300: '#94A3B8',
      border400: '#64748B',
      border500: '#475569',
      border600: '#334155',
      border700: '#1E293B',
      border800: '#1A1F2E',
      border900: '#0F172A',
      border950: '#020617',

      // Error/Destructive
      error0: '#FFFFFF',
      error50: '#FEF2F2',
      error100: '#FEE2E2',
      error200: '#FECACA',
      error300: '#FCA5A5',
      error400: '#F87171',
      error500: '#EF4444', // Destructive
      error600: '#DC2626',
      error700: '#B91C1C',
      error800: '#991B1B',
      error900: '#7F1D1D',
      error950: '#450A0A',
    },
    space: {
      px: '1px',
      0: '0px',
      0.5: '2px',
      1: '4px',
      1.5: '6px',
      2: '8px',
      2.5: '10px',
      3: '12px',
      3.5: '14px',
      4: '16px',
      5: '20px',
      6: '24px',
      7: '28px',
      8: '32px',
      9: '36px',
      10: '40px',
      12: '48px',
      16: '64px',
      20: '80px',
      24: '96px',
      32: '128px',
      40: '160px',
      48: '192px',
      56: '224px',
      64: '256px',
    },
    borderRadius: {
      none: '0px',
      xs: '2px',
      sm: '6px',
      md: '8px',
      lg: '10px', // Border radius principal
      xl: '14px',
      '2xl': '18px',
      '3xl': '22px',
      '4xl': '26px',
      full: '9999px',
    },
  },
  components: {
    Button: {
      theme: {
        variants: {
          action: 'primary',
          variant: 'solid',
          size: 'md',
        },
      },
    },
    Card: {
      theme: {
        variants: {
          variant: 'elevated',
        },
      },
    },
    Input: {
      theme: {
        variants: {
          size: 'md',
        },
      },
    },
  },
});

export default config;
