import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  { path: '/', redirect: '/hot' },
  {
    path: '/search',
    name: 'Search',
    component: () => import('../views/SearchNav.vue'),
    meta: { title: '搜索结果' }
  },
  {
    path: '/frontend',
    name: 'Frontend',
    component: () => import('../views/FrontendNav.vue'),
    meta: { title: '前端导航', category: 'frontend' }
  },
  {
    path: '/design',
    name: 'Design',
    component: () => import('../views/DesignNav.vue'),
    meta: { title: '设计导航', category: 'design' }
  },
  {
    path: '/backend',
    name: 'Backend',
    component: () => import('../views/BackendNav.vue'),
    meta: { title: '后端导航', category: 'backend' }
  },
  {
    path: '/movie',
    name: 'Movie',
    component: () => import('../views/MovieNav.vue'),
    meta: { title: '电影导航', category: 'movie' }
  },
  {
    path: '/music',
    name: 'Music',
    component: () => import('../views/MusicNav.vue'),
    meta: { title: '音乐导航', category: 'music' }
  },
  {
    path: '/hot',
    name: 'Hot',
    component: () => import('../views/HotNav.vue'),
    meta: { title: '热门导航', category: 'hot' }
  },
  {
    path: '/cat/:catKey',
    name: 'UserCategory',
    component: () => import('../views/FrontendNav.vue'),
    meta: { title: '自定义分类' }
  },
  { path: '/:pathMatch(.*)*', redirect: '/hot' }
]

const router = createRouter({ history: createWebHistory(), routes })

router.afterEach((to) => {
  document.title = to.meta.title ? `${to.meta.title} - Kakarotte` : 'Kakarotte'
})

export default router
