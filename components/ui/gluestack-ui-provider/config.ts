'use client';
import { Colors } from '@/constants/Colors';
import { vars } from 'nativewind';

// Helper function to convert HEX to RGB
function hexToRgb(hex: string) {
  hex = hex.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  return `${r} ${g} ${b}`;
}

// Convert all colors in a theme to RGB
function convertThemeToRgb(theme: any) {
  const result: Record<string, Record<string, string>> = {};
  for (const [category, colors] of Object.entries(theme)) {
    result[category] = {};
    for (const [shade, hex] of Object.entries(colors as Record<string, string>)) {
      result[category][shade] = hexToRgb(hex);
    }
  }
  return result;
}

// Convert colors to RGB format
const lightColors = convertThemeToRgb(Colors.light);
const darkColors = convertThemeToRgb(Colors.dark);
const oledColors = convertThemeToRgb((Colors as any).oled);

function getThemeVars(themeColors: any) {
  return {
    '--color-primary-0': themeColors.primary['0'],
    '--color-primary-50': themeColors.primary['50'],
    '--color-primary-100': themeColors.primary['100'],
    '--color-primary-200': themeColors.primary['200'],
    '--color-primary-300': themeColors.primary['300'],
    '--color-primary-400': themeColors.primary['400'],
    '--color-primary-500': themeColors.primary['500'],
    '--color-primary-600': themeColors.primary['600'],
    '--color-primary-700': themeColors.primary['700'],
    '--color-primary-800': themeColors.primary['800'],
    '--color-primary-900': themeColors.primary['900'],
    '--color-primary-950': themeColors.primary['950'],

    '--color-secondary-0': themeColors.secondary['0'],
    '--color-secondary-50': themeColors.secondary['50'],
    '--color-secondary-100': themeColors.secondary['100'],
    '--color-secondary-200': themeColors.secondary['200'],
    '--color-secondary-300': themeColors.secondary['300'],
    '--color-secondary-400': themeColors.secondary['400'],
    '--color-secondary-500': themeColors.secondary['500'],
    '--color-secondary-600': themeColors.secondary['600'],
    '--color-secondary-700': themeColors.secondary['700'],
    '--color-secondary-800': themeColors.secondary['800'],
    '--color-secondary-900': themeColors.secondary['900'],
    '--color-secondary-950': themeColors.secondary['950'],

    '--color-tertiary-0': themeColors.tertiary['0'] || themeColors.tertiary['50'],
    '--color-tertiary-50': themeColors.tertiary['50'],
    '--color-tertiary-100': themeColors.tertiary['100'],
    '--color-tertiary-200': themeColors.tertiary['200'],
    '--color-tertiary-300': themeColors.tertiary['300'],
    '--color-tertiary-400': themeColors.tertiary['400'],
    '--color-tertiary-500': themeColors.tertiary['500'],
    '--color-tertiary-600': themeColors.tertiary['600'],
    '--color-tertiary-700': themeColors.tertiary['700'],
    '--color-tertiary-800': themeColors.tertiary['800'],
    '--color-tertiary-900': themeColors.tertiary['900'],
    '--color-tertiary-950': themeColors.tertiary['950'],

    '--color-error-0': themeColors.error['0'],
    '--color-error-50': themeColors.error['50'],
    '--color-error-100': themeColors.error['100'],
    '--color-error-200': themeColors.error['200'],
    '--color-error-300': themeColors.error['300'],
    '--color-error-400': themeColors.error['400'],
    '--color-error-500': themeColors.error['500'],
    '--color-error-600': themeColors.error['600'],
    '--color-error-700': themeColors.error['700'],
    '--color-error-800': themeColors.error['800'],
    '--color-error-900': themeColors.error['900'],
    '--color-error-950': themeColors.error['950'],

    '--color-success-0': themeColors.success['0'],
    '--color-success-50': themeColors.success['50'],
    '--color-success-100': themeColors.success['100'],
    '--color-success-200': themeColors.success['200'],
    '--color-success-300': themeColors.success['300'],
    '--color-success-400': themeColors.success['400'],
    '--color-success-500': themeColors.success['500'],
    '--color-success-600': themeColors.success['600'],
    '--color-success-700': themeColors.success['700'],
    '--color-success-800': themeColors.success['800'],
    '--color-success-900': themeColors.success['900'],
    '--color-success-950': themeColors.success['950'],

    '--color-warning-0': themeColors.warning['0'],
    '--color-warning-50': themeColors.warning['50'],
    '--color-warning-100': themeColors.warning['100'],
    '--color-warning-200': themeColors.warning['200'],
    '--color-warning-300': themeColors.warning['300'],
    '--color-warning-400': themeColors.warning['400'],
    '--color-warning-500': themeColors.warning['500'],
    '--color-warning-600': themeColors.warning['600'],
    '--color-warning-700': themeColors.warning['700'],
    '--color-warning-800': themeColors.warning['800'],
    '--color-warning-900': themeColors.warning['900'],
    '--color-warning-950': themeColors.warning['950'],

    '--color-info-0': themeColors.info['0'],
    '--color-info-50': themeColors.info['50'],
    '--color-info-100': themeColors.info['100'],
    '--color-info-200': themeColors.info['200'],
    '--color-info-300': themeColors.info['300'],
    '--color-info-400': themeColors.info['400'],
    '--color-info-500': themeColors.info['500'],
    '--color-info-600': themeColors.info['600'],
    '--color-info-700': themeColors.info['700'],
    '--color-info-800': themeColors.info['800'],
    '--color-info-900': themeColors.info['900'],
    '--color-info-950': themeColors.info['950'],

    '--color-typography-0': themeColors.typography['0'],
    '--color-typography-50': themeColors.typography['50'],
    '--color-typography-100': themeColors.typography['100'],
    '--color-typography-200': themeColors.typography['200'],
    '--color-typography-300': themeColors.typography['300'],
    '--color-typography-400': themeColors.typography['400'],
    '--color-typography-500': themeColors.typography['500'],
    '--color-typography-600': themeColors.typography['600'],
    '--color-typography-700': themeColors.typography['700'],
    '--color-typography-800': themeColors.typography['800'],
    '--color-typography-900': themeColors.typography['900'],
    '--color-typography-950': themeColors.typography['950'],

    '--color-outline-0': themeColors.outline['0'],
    '--color-outline-50': themeColors.outline['50'],
    '--color-outline-100': themeColors.outline['100'],
    '--color-outline-200': themeColors.outline['200'],
    '--color-outline-300': themeColors.outline['300'],
    '--color-outline-400': themeColors.outline['400'],
    '--color-outline-500': themeColors.outline['500'],
    '--color-outline-600': themeColors.outline['600'],
    '--color-outline-700': themeColors.outline['700'],
    '--color-outline-800': themeColors.outline['800'],
    '--color-outline-900': themeColors.outline['900'],
    '--color-outline-950': themeColors.outline['950'],

    '--color-background-0': themeColors.background['0'],
    '--color-background-50': themeColors.background['50'],
    '--color-background-100': themeColors.background['100'],
    '--color-background-200': themeColors.background['200'],
    '--color-background-300': themeColors.background['300'],
    '--color-background-400': themeColors.background['400'],
    '--color-background-500': themeColors.background['500'],
    '--color-background-600': themeColors.background['600'],
    '--color-background-700': themeColors.background['700'],
    '--color-background-800': themeColors.background['800'],
    '--color-background-900': themeColors.background['900'],
    '--color-background-950': themeColors.background['950'],

    '--color-accent-0': themeColors.accent['0'],
    '--color-accent-50': themeColors.accent['50'],
    '--color-accent-100': themeColors.accent['100'],
    '--color-accent-200': themeColors.accent['200'],
    '--color-accent-300': themeColors.accent['300'],
    '--color-accent-400': themeColors.accent['400'],
    '--color-accent-500': themeColors.accent['500'],
    '--color-accent-600': themeColors.accent['600'],
    '--color-accent-700': themeColors.accent['700'],
    '--color-accent-800': themeColors.accent['800'],
    '--color-accent-900': themeColors.accent['900'],
    '--color-accent-950': themeColors.accent['950'],
  };
}

export const config = {
  light: vars(getThemeVars(lightColors)),
  dark: vars(getThemeVars(darkColors)),
  oled: vars(getThemeVars(oledColors)),
};
