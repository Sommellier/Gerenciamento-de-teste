import type { RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: () => import('layouts/MainLayout.vue'),
    children: [
      { path: '', redirect: { name: 'login' } },

      // público
      { path: 'login',           name: 'login',    component: () => import('pages/LoginPage.vue') },
      { path: 'register',        name: 'register', component: () => import('pages/RegisterPage.vue') },
      { path: 'forgot-password', name: 'forgot',   component: () => import('pages/ForgotPasswordPage.vue') },
      { path: 'reset-password',  name: 'reset',    component: () => import('pages/ResetPasswordPage.vue') },

      // protegido
      { path: 'dashboard', name: 'dashboard', component: () => import('pages/DashboardPage.vue'), meta: { requiresAuth: true } },

      // --- CONVITES ---
      { path: 'invites', name: 'invites', component: () => import('pages/InvitesPage.vue'), meta: { requiresAuth: true } },

      // --- PROJETOS ---
      { path: 'projects', name: 'projects', component: () => import('pages/ProjectsPage.vue'), meta: { requiresAuth: true } },
      { path: 'create-project', name: 'project-create', component: () => import('pages/Createproject.vue'), meta: { requiresAuth: true } },
      { path: 'projects/:id/edit', name: 'project-edit', component: () => import('pages/EditProjectPage.vue'), meta: { requiresAuth: true } },
      { path: 'projects/:projectId', name: 'project-details', component: () => import('pages/ProjectDetails.vue'), meta: { requiresAuth: true } },
      { path: 'projects/:projectId/scenarios', name: 'scenarios', component: () => import('pages/ScenariosPage.vue'), meta: { requiresAuth: true } },
      { path: 'projects/:projectId/create-scenario', name: 'create-scenario', component: () => import('pages/CreateScenario.vue'), meta: { requiresAuth: true } },
      
      // --- PACOTES DE TESTE ---
      { path: 'projects/:projectId/packages', name: 'packages', component: () => import('pages/PackagesPage.vue'), meta: { requiresAuth: true } },
      { path: 'projects/:projectId/packages/:packageId', name: 'package-details', component: () => import('pages/PackageDetailsPage.vue'), meta: { requiresAuth: true } },
      { path: 'projects/:projectId/packages/:packageId/scenarios', name: 'package-scenarios', component: () => import('pages/PackageScenarios.vue'), meta: { requiresAuth: true } },
      { path: 'projects/:projectId/packages/:packageId/scenarios/:scenarioId', name: 'scenario-details', component: () => import('pages/ScenarioDetailsPage.vue'), meta: { requiresAuth: true } },
      { path: 'projects/:projectId/packages/:packageId/scenarios/:scenarioId/execute', name: 'scenario-execution', component: () => import('pages/ScenarioExecutionPage.vue'), meta: { requiresAuth: true } },
      { path: 'projects/:projectId/create-package', name: 'create-package', component: () => import('pages/CreatePackage.vue'), meta: { requiresAuth: true } },
      { path: 'projects/:projectId/packages/:packageId/edit', name: 'edit-package', component: () => import('pages/EditPackagePage.vue'), meta: { requiresAuth: true } },

      // --- PERFIL ---
      { path: 'profile', name: 'profile', component: () => import('pages/ProfilePage.vue'), meta: { requiresAuth: true } },
    ],
  },

  { path: '/:catchAll(.*)*', component: () => import('pages/ErrorNotFound.vue') },
]

export default routes
