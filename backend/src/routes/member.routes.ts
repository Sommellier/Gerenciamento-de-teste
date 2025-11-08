import { Router } from 'express'
import { addMemberByEmailController } from '../controllers/members/addMemberByEmail.controller'
import { listMembersController } from '../controllers/members/listMembers.controller'
import { updateMemberRoleController } from '../controllers/members/updateMemberRole.controller'
import { removeMemberController } from '../controllers/members/removeMember.controller'
import { leaveProjectController } from '../controllers/members/leaveProject.controller'
import { auth } from '../infrastructure/auth'


const asyncH =
  (fn: any) =>
  (req: any, res: any, next: any) =>
    Promise.resolve(fn(req, res, next)).catch(next)

const router = Router()

// Rotas com auth
router.post('/projects/:projectId/members/by-email', auth, asyncH(addMemberByEmailController))
router.put('/projects/:projectId/members/:userId/role', auth, asyncH(updateMemberRoleController))
router.delete('/projects/:projectId/members/:userId', auth, asyncH(removeMemberController))
router.post('/projects/:projectId/members/leave', auth, asyncH(leaveProjectController))

// Rota para listar membros do projeto
router.get('/projects/:projectId/members', auth, asyncH(listMembersController))

export default router
