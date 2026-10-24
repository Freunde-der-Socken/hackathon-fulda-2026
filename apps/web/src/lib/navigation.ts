import { HomeIcon, BookOpenIcon, ChartLineIcon, MicIcon, SchoolIcon, TimerIcon } from '@lucide/vue';
import type { Component } from 'vue';

export interface NavItem {
  label: string;
  icon: Component;
  to: string;
  /** Shown in the "More" sheet on phones instead of the bottom tab bar (keep tabs to 4). */
  secondary?: boolean;
  /** Not a Vue Router route, so it renders as a plain link. */
  external?: boolean;
}

export const navItems: NavItem[] = [
  { label: 'Home', icon: HomeIcon, to: '/' },
  { label: 'Lesson', icon: TimerIcon, to: '/lesson' },
  { label: 'Sensors', icon: ChartLineIcon, to: '/sensors' },
  { label: 'Noise', icon: MicIcon, to: '/noise' },
  { label: 'Classes', icon: SchoolIcon, to: '/classes', secondary: true },
  { label: 'API docs', icon: BookOpenIcon, to: '/api/docs/', secondary: true, external: true },
];
