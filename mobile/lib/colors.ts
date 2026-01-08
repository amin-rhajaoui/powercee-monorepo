/**
 * Palette de couleurs extraite de l'application web
 * Conversion HSL vers RGB/Hex pour React Native
 */

// Fonction utilitaire pour convertir HSL en RGB
function hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
  s /= 100;
  l /= 100;

  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;

  if (0 <= h && h < 60) {
    r = c; g = x; b = 0;
  } else if (60 <= h && h < 120) {
    r = x; g = c; b = 0;
  } else if (120 <= h && h < 180) {
    r = 0; g = c; b = x;
  } else if (180 <= h && h < 240) {
    r = 0; g = x; b = c;
  } else if (240 <= h && h < 300) {
    r = x; g = 0; b = c;
  } else if (300 <= h && h < 360) {
    r = c; g = 0; b = x;
  }

  r = Math.round((r + m) * 255);
  g = Math.round((g + m) * 255);
  b = Math.round((b + m) * 255);

  return { r, g, b };
}

function rgbToHex(r: number, g: number, b: number): string {
  return `#${[r, g, b].map(x => {
    const hex = x.toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('')}`;
}

// Couleurs Light Mode (depuis globals.css :root)
export const lightColors = {
  // Primary: hsl(349 62% 27%) → #8B1A2B
  primary: '#8B1A2B',
  primaryForeground: '#FFFFFF',
  
  // Background: hsl(210 40% 98%) → #F5F7FA
  background: '#F5F7FA',
  
  // Foreground: hsl(222 47% 11%) → #1A1F2E
  foreground: '#1A1F2E',
  
  // Card: hsl(0 0% 100%) → #FFFFFF
  card: '#FFFFFF',
  cardForeground: '#1A1F2E',
  
  // Border: hsl(214.3 31.8% 91.4%) → #E5E9F0
  border: '#E5E9F0',
  
  // Input: hsl(214.3 31.8% 91.4%) → #E5E9F0
  input: '#E5E9F0',
  
  // Muted: hsl(210 40% 96.1%) → #F0F3F6
  muted: '#F0F3F6',
  mutedForeground: '#64748B',
  
  // Secondary: hsl(210 40% 96.1%) → #F0F3F6
  secondary: '#F0F3F6',
  secondaryForeground: '#1A1F2E',
  
  // Accent: hsl(210 40% 96.1%) → #F0F3F6
  accent: '#F0F3F6',
  accentForeground: '#1A1F2E',
  
  // Destructive: hsl(0 84.2% 60.2%) → #EF4444
  destructive: '#EF4444',
  destructiveForeground: '#FFFFFF',
  
  // Ring: hsl(349 62% 27%) → #8B1A2B
  ring: '#8B1A2B',
};

// Couleurs Dark Mode (depuis globals.css .dark)
export const darkColors = {
  // Primary: hsl(349 62% 45%) → #C23D56
  primary: '#C23D56',
  primaryForeground: '#FFFFFF',
  
  // Background: hsl(222 47% 11%) → #1A1F2E
  background: '#1A1F2E',
  
  // Foreground: hsl(210 40% 98%) → #F5F7FA
  foreground: '#F5F7FA',
  
  // Card: hsl(222 47% 11%) → #1A1F2E
  card: '#1A1F2E',
  cardForeground: '#F5F7FA',
  
  // Border: hsl(217.2 32.6% 17.5%) → #2D3748
  border: '#2D3748',
  
  // Input: hsl(217.2 32.6% 17.5%) → #2D3748
  input: '#2D3748',
  
  // Muted: hsl(217.2 32.6% 17.5%) → #2D3748
  muted: '#2D3748',
  mutedForeground: '#94A3B8',
  
  // Secondary: hsl(217.2 32.6% 17.5%) → #2D3748
  secondary: '#2D3748',
  secondaryForeground: '#F5F7FA',
  
  // Accent: hsl(217.2 32.6% 17.5%) → #2D3748
  accent: '#2D3748',
  accentForeground: '#F5F7FA',
  
  // Destructive: hsl(0 62.8% 30.6%) → #B91C1C
  destructive: '#B91C1C',
  destructiveForeground: '#FFFFFF',
  
  // Ring: hsl(349 62% 45%) → #C23D56
  ring: '#C23D56',
};

// Radius (0.625rem = 10px)
export const borderRadius = {
  sm: 6,   // calc(var(--radius) - 4px)
  md: 8,   // calc(var(--radius) - 2px)
  lg: 10,  // var(--radius)
  xl: 14,  // calc(var(--radius) + 4px)
  '2xl': 18, // calc(var(--radius) + 8px)
  '3xl': 22, // calc(var(--radius) + 12px)
  '4xl': 26, // calc(var(--radius) + 16px)
};
