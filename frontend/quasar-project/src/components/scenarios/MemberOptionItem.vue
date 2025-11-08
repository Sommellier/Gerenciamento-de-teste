<template>
  <q-item v-bind="scope.itemProps">
    <q-item-section avatar>
      <q-avatar :color="getMemberColor(scope.opt.value)" text-color="white" size="32px">
        {{ getInitials(scope.opt.label) }}
      </q-avatar>
    </q-item-section>
    <q-item-section>
      <q-item-label>{{ scope.opt.label }}</q-item-label>
      <q-item-label caption>{{ scope.opt.email }}</q-item-label>
    </q-item-section>
  </q-item>
</template>

<script setup lang="ts">
import { getInitials, getMemberColor } from '../../utils/helpers'

interface Props {
  scope: {
    itemProps: Record<string, unknown>
    opt: {
      value: number
      label: string
      email: string
    }
  }
}

defineProps<Props>()
</script>

