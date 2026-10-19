import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  scrollBehavior(_to, _from, savedPosition) {
    if (savedPosition) {
      return savedPosition
    }
    return { top: 0 }
  },
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('@/features/home/HomeView.vue'),
    },
    {
      path: '/frontend',
      name: 'frontend',
      component: () => import('@/features/catalog/DomainView.vue'),
      props: { domainId: 'frontend' },
    },
    {
      path: '/backend',
      name: 'backend',
      component: () => import('@/features/catalog/DomainView.vue'),
      props: { domainId: 'backend' },
    },
    {
      path: '/practice/:scope',
      name: 'practice',
      component: () => import('@/features/practice/PracticeView.vue'),
    },
    {
      path: '/result',
      name: 'result',
      component: () => import('@/features/result/ResultView.vue'),
    },
    {
      path: '/wrong',
      name: 'wrongbook',
      component: () => import('@/features/wrongbook/WrongBookView.vue'),
    },
    {
      path: '/stats',
      name: 'stats',
      component: () => import('@/features/stats/StatsView.vue'),
    },
    {
      path: '/handwritten',
      name: 'handwritten',
      component: () => import('@/features/handwritten/HandwrittenListView.vue'),
    },
    {
      path: '/handwritten/:id',
      name: 'handwritten-detail',
      component: () => import('@/features/handwritten/HandwrittenDetailView.vue'),
    },
    {
      path: '/settings',
      name: 'settings',
      component: () => import('@/features/settings/SettingsView.vue'),
    },
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: () => import('@/features/common/NotFoundView.vue'),
    },
  ],
})

export default router
