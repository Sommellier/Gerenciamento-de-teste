<template>
  <q-layout view="hHh lpR fFf">
    <!-- Header e drawer removidos -->

    <q-page-container>
      <router-view />
    </q-page-container>
  </q-layout>
</template>

<script setup lang="ts">
// Layout sem header e drawer
</script>

<style scoped>
/* Layout fullscreen */
:deep(.q-layout) {
  height: 100vh;
  background: transparent;
}

:deep(.q-page-container) {
  padding: 0;
}
</style>


