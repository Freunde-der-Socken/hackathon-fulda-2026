<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { Button } from '@/components/ui/button';

const { t } = useI18n();
</script>

<template>
  <div class="flex flex-col items-start gap-4">
    <h1 class="text-2xl font-semibold">{{ t('notFound.title') }}</h1>
    <p class="text-muted-foreground">{{ t('notFound.text') }}</p>
    <Button as-child>
      <RouterLink to="/">{{ t('notFound.back') }}</RouterLink>
    </Button>
  </div>
</template>
