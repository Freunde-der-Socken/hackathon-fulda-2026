import {
  HomeIcon,
  BookOpenIcon,
  ChartLineIcon,
  MicIcon,
  SchoolIcon,
  SproutIcon,
  TimerIcon,
} from '@lucide/vue';
import type { Component } from 'vue';
import type en from '@/locales/en';

export interface NavItem {
  /** Its label is `nav.<id>` in the locale messages. */
  id: keyof typeof en.nav;
  icon: Component;
  to: string;
  /** Shown in the "More" sheet on phones instead of the bottom tab bar (keep tabs to 4). */
  secondary?: boolean;
  /** Not a Vue Router route, so it renders as a plain link. */
  external?: boolean;
}

export const navItems: NavItem[] = [
  { id: 'home', icon: HomeIcon, to: '/' },
  { id: 'lesson', icon: TimerIcon, to: '/lesson' },
  { id: 'sensors', icon: ChartLineIcon, to: '/sensors' },
  { id: 'review', icon: SproutIcon, to: '/review' },
  // Runs on the phone that measures in the room, not the teacher's, so it isn't a tab
  { id: 'noise', icon: MicIcon, to: '/noise', secondary: true },
  { id: 'classes', icon: SchoolIcon, to: '/classes', secondary: true },
  { id: 'apiDocs', icon: BookOpenIcon, to: '/api/docs/', secondary: true, external: true },
];
