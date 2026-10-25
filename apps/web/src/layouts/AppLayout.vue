<script setup lang="ts">
import {
  LanguagesIcon,
  MenuIcon,
  MoonIcon,
  PanelLeftCloseIcon,
  PanelLeftOpenIcon,
  SunIcon,
} from '@lucide/vue';
import { useDark, useLocalStorage, useToggle } from '@vueuse/core';
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute } from 'vue-router';
import LanguageMenu from '@/components/LanguageMenu.vue';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Toaster } from '@/components/ui/sonner';
import { isLocale, LOCALE_NAMES } from '@/lib/i18n';
import { navItems } from '@/lib/navigation';
import { cn } from '@/lib/utils';

const APP_NAME = 'Hackathon Fulda';

const primaryItems = computed(() => navItems.filter((item) => !item.secondary));
const secondaryItems = computed(() => navItems.filter((item) => item.secondary));

const collapsed = useLocalStorage('sidebar-collapsed', false);

// Follows the system setting until someone toggles it, then remembers the choice
const isDark = useDark();
const toggleDark = useToggle(isDark);

const route = useRoute();
const { t, locale } = useI18n();
const localeName = computed(() => (isLocale(locale.value) ? LOCALE_NAMES[locale.value] : ''));

const linkClass =
  'flex min-h-11 items-center gap-3 rounded-md px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground';
const activeClass = 'bg-accent text-accent-foreground';
</script>

<template>
  <div class="flex min-h-dvh flex-col md:flex-row">
    <!-- Desktop: collapsible sidebar -->
    <aside
      :class="
        cn(
          'sticky top-0 hidden h-dvh shrink-0 flex-col border-r bg-card transition-[width] md:flex',
          collapsed ? 'w-16' : 'w-60',
        )
      "
    >
      <div class="flex h-14 items-center justify-between gap-2 px-3">
        <span v-if="!collapsed" class="truncate px-1 font-semibold">{{ APP_NAME }}</span>
        <Button
          variant="ghost"
          size="icon"
          class="size-11 shrink-0"
          :aria-label="collapsed ? t('layout.expandSidebar') : t('layout.collapseSidebar')"
          @click="collapsed = !collapsed"
        >
          <PanelLeftOpenIcon v-if="collapsed" />
          <PanelLeftCloseIcon v-else />
        </Button>
      </div>
      <nav class="flex flex-col gap-1 p-2" :aria-label="t('layout.main')">
        <template v-for="item in navItems" :key="item.to">
          <a
            v-if="item.external"
            :href="item.to"
            :class="cn(linkClass, collapsed && 'justify-center px-0')"
            :title="t(`nav.${item.id}`)"
          >
            <component :is="item.icon" class="size-5 shrink-0" />
            <span v-if="!collapsed">{{ t(`nav.${item.id}`) }}</span>
          </a>
          <RouterLink
            v-else
            :to="item.to"
            :class="cn(linkClass, collapsed && 'justify-center px-0')"
            :active-class="activeClass"
            :title="t(`nav.${item.id}`)"
          >
            <component :is="item.icon" class="size-5 shrink-0" />
            <span v-if="!collapsed">{{ t(`nav.${item.id}`) }}</span>
          </RouterLink>
        </template>
      </nav>
      <div class="mt-auto p-2">
        <button
          type="button"
          :class="cn(linkClass, 'w-full', collapsed && 'justify-center px-0')"
          :title="isDark ? t('layout.lightMode') : t('layout.darkMode')"
          @click="toggleDark()"
        >
          <SunIcon v-if="isDark" class="size-5 shrink-0" />
          <MoonIcon v-else class="size-5 shrink-0" />
          <span v-if="!collapsed">{{ isDark ? t('layout.lightMode') : t('layout.darkMode') }}</span>
        </button>
        <LanguageMenu side="right" align="end">
          <button
            type="button"
            :class="cn(linkClass, 'w-full', collapsed && 'justify-center px-0')"
            :title="t('layout.language')"
          >
            <LanguagesIcon class="size-5 shrink-0" />
            <span v-if="!collapsed">{{ localeName }}</span>
          </button>
        </LanguageMenu>
      </div>
    </aside>

    <!-- Phone: top bar -->
    <header
      class="sticky top-0 z-10 flex h-14 shrink-0 items-center border-b bg-card px-4 pt-[env(safe-area-inset-top)] box-content md:hidden"
    >
      <span class="font-semibold">{{ APP_NAME }}</span>
      <LanguageMenu align="end">
        <Button
          variant="ghost"
          size="icon"
          class="ml-auto size-11"
          :aria-label="t('layout.language')"
        >
          <LanguagesIcon />
        </Button>
      </LanguageMenu>
      <Button
        variant="ghost"
        size="icon"
        class="-mr-2 size-11"
        :aria-label="isDark ? t('layout.switchToLight') : t('layout.switchToDark')"
        @click="toggleDark()"
      >
        <SunIcon v-if="isDark" />
        <MoonIcon v-else />
      </Button>
    </header>

    <main
      class="flex-1 px-4 py-6 pb-[calc(5rem+env(safe-area-inset-bottom))] pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] md:px-8 md:pb-8"
    >
      <!-- Text pages stay readable at max-w-4xl; dashboards opt out with `meta: { fullWidth: true }` -->
      <div :class="cn('mx-auto w-full', !route.meta.fullWidth && 'max-w-4xl')">
        <slot />
      </div>
    </main>

    <!-- Phone: bottom tab bar -->
    <nav
      class="fixed inset-x-0 bottom-0 z-10 flex border-t bg-card pb-[env(safe-area-inset-bottom)] md:hidden"
      :aria-label="t('layout.main')"
    >
      <RouterLink
        v-for="item in primaryItems"
        :key="item.to"
        :to="item.to"
        class="flex min-h-14 min-w-11 flex-1 flex-col items-center justify-center gap-0.5 text-xs font-medium text-muted-foreground"
        active-class="text-primary"
      >
        <component :is="item.icon" class="size-5" />
        {{ t(`nav.${item.id}`) }}
      </RouterLink>

      <Sheet v-if="secondaryItems.length">
        <SheetTrigger as-child>
          <button
            type="button"
            class="flex min-h-14 min-w-11 flex-1 flex-col items-center justify-center gap-0.5 text-xs font-medium text-muted-foreground"
          >
            <MenuIcon class="size-5" />
            {{ t('layout.more') }}
          </button>
        </SheetTrigger>
        <SheetContent side="bottom" class="pb-[env(safe-area-inset-bottom)]">
          <SheetHeader>
            <SheetTitle>{{ t('layout.more') }}</SheetTitle>
          </SheetHeader>
          <nav class="flex flex-col gap-1 p-4 pt-0" :aria-label="t('layout.more')">
            <template v-for="item in secondaryItems" :key="item.to">
              <a v-if="item.external" :href="item.to" :class="linkClass">
                <component :is="item.icon" class="size-5" />
                {{ t(`nav.${item.id}`) }}
              </a>
              <RouterLink v-else :to="item.to" :class="linkClass" :active-class="activeClass">
                <component :is="item.icon" class="size-5" />
                {{ t(`nav.${item.id}`) }}
              </RouterLink>
            </template>
          </nav>
        </SheetContent>
      </Sheet>
    </nav>

    <Toaster position="top-center" />
  </div>
</template>
