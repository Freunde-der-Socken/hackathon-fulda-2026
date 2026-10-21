<script setup lang="ts">
import { HealthResponse } from '@repo/contracts';
import { onMounted, ref } from 'vue';
import { toast } from 'vue-sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { apiGet } from '@/lib/api';

const health = ref<HealthResponse>();
const loading = ref(true);

onMounted(async () => {
  try {
    health.value = await apiGet('/health', HealthResponse);
  } catch (error) {
    toast.error('Could not reach the API', {
      description: error instanceof Error ? error.message : String(error),
    });
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <div class="flex flex-col gap-6">
    <h1 class="text-2xl font-semibold">Home</h1>
    <Card>
      <CardHeader>
        <CardTitle>API health</CardTitle>
        <CardDescription
          >GET /api/health, validated with HealthResponse from @repo/contracts</CardDescription
        >
      </CardHeader>
      <CardContent>
        <div v-if="loading" class="flex flex-col gap-2" aria-busy="true">
          <Skeleton class="h-5 w-32" />
          <Skeleton class="h-5 w-24" />
        </div>
        <dl v-else-if="health" class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
          <dt class="text-muted-foreground">Status</dt>
          <dd>{{ health.status }}</dd>
          <dt class="text-muted-foreground">Version</dt>
          <dd>{{ health.version }}</dd>
        </dl>
        <p v-else class="text-sm text-muted-foreground">No response from the API.</p>
      </CardContent>
    </Card>
  </div>
</template>
