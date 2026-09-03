<!--
  Numbered card from template slide 11: a large light-weight orange numeral,
  a connector, then a solid orange box outlined in navy.
-->
<script setup lang="ts">
defineProps<{ num: string; title: string }>()
</script>

<template>
  <div class="atm-numcard">
    <div class="atm-numcard__head">
      <div class="atm-numcard__num">{{ num }}</div>
      <Connector width="86px" />
    </div>
    <div class="atm-numcard__box atm-numcard__box--grow">
      <div class="atm-numcard__title">{{ title }}</div>
      <div class="atm-numcard__text"><slot /></div>
    </div>
  </div>
</template>

<style scoped>
.atm-numcard { display: flex; flex-direction: column; height: 100%; }
.atm-numcard__head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 0.5em;
  flex: 0 0 auto;
  margin-bottom: 10px;
}
.atm-numcard__box--grow { flex: 1 1 auto; }
</style>
