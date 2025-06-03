import type { RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: () => import('layouts/MainLayout.vue'),
    children: [
      { path: '', component: () => import('pages/LoginPage.vue') },              // <- acessível em "/"
      { path: 'login', component: () => import('pages/LoginPage.vue') },         // <- acessível em "/login"
      { path: 'register', component: () => import('pages/RegisterPage.vue') },   // <- acessível em "/register"
      { path: 'forgot-password', component: () => import('pages/ForgotPasswordPage.vue') }, // <- acessível em "/forgot-password"
      { path: 'reset-password', component: () => import('pages/ResetPasswordPage.vue') }, // <- acessível em "/reset-password"
    ],
  },
  {
    path: '/:catchAll(.*)*',
    component: () => import('pages/ErrorNotFound.vue'),
  },

  {
    path: '/reset-password',
    component: () => import('pages/ResetPasswordPage.vue')
  },


]



export default routes
