<script setup lang="ts">
import { Button } from '@/components/ui/button';
</script>

<template>
  <div class="flex flex-col items-start gap-4">
    <h1 class="text-2xl font-semibold">Page not found</h1>
    <p class="text-muted-foreground">The page you are looking for does not exist.</p>
    <Button as-child>
      <RouterLink to="/">Back home</RouterLink>
    </Button>
  </div>
</template>
