<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { isLocale, LOCALE_NAMES, LOCALES, setLocale } from '@/lib/i18n';

// The layout passes the trigger: a full row in the sidebar, an icon button in the phone's top bar
defineProps<{ side?: 'top' | 'right' | 'bottom' | 'left'; align?: 'start' | 'center' | 'end' }>();

const { t, locale } = useI18n();

const pick = (value: unknown) => {
  if (isLocale(value)) setLocale(value);
};
</script>

<template>
  <DropdownMenu>
    <DropdownMenuTrigger as-child>
      <slot />
    </DropdownMenuTrigger>
    <DropdownMenuContent :side="side" :align="align">
      <DropdownMenuLabel>{{ t('layout.language') }}</DropdownMenuLabel>
      <DropdownMenuSeparator />
      <DropdownMenuRadioGroup :model-value="locale" @update:model-value="pick">
        <DropdownMenuRadioItem
          v-for="l in LOCALES"
          :key="l"
          :value="l"
          :lang="l"
          class="min-h-11 md:min-h-8"
        >
          {{ LOCALE_NAMES[l] }}
        </DropdownMenuRadioItem>
      </DropdownMenuRadioGroup>
    </DropdownMenuContent>
  </DropdownMenu>
</template>
