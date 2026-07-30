/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#21262c',
    background: '#eae3d3',
    backgroundElement: '#f6f2e8',
    backgroundSelected: '#efe8d8',
    textSecondary: '#5c6570',
    textFaint: '#8b93a0',
    border: '#d8cdb4',
    borderSoft: '#e2d8c1',
    surfaceRaised: '#fffdf7',
    accent: '#a9762a',
    accentStrong: '#8f5f1e',
    accentInk: '#fff8ea',
    teal: '#3f7d78',
    crisis: '#a52f27',
    crisisStrong: '#8c261f',
    success: '#4f7a44',
  },
  dark: {
    text: '#e8e4d9',
    background: '#12161b',
    backgroundElement: '#1a1f26',
    backgroundSelected: '#263040',
    textSecondary: '#9aa3af',
    textFaint: '#5f6a78',
    border: '#2c3542',
    borderSoft: '#232b35',
    surfaceRaised: '#212832',
    accent: '#d1a24f',
    accentStrong: '#e6b95c',
    accentInk: '#241a06',
    teal: '#5b9a95',
    crisis: '#c1443b',
    crisisStrong: '#d6564c',
    success: '#6a9c5f',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
