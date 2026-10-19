<template>
  <footer class="site-footer">
    <div class="container-page site-footer__inner">
      <p>解析保留题库原文；选项与错因由 AI 基于原文生成，仅供学习。</p>
      <p class="mono">八股训练场 · LOCAL FIRST</p>
    </div>
  </footer>
</template>

<style scoped>
.site-footer {
  margin-top: 72px;
  border-top: 1px solid var(--border);
}

.site-footer__inner {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 10px 24px;
  padding-block: 24px 32px;
  color: var(--faint);
  font-size: 11px;
}

.site-footer__inner .mono {
  font-size: 10px;
  letter-spacing: 0.12em;
}
</style>
