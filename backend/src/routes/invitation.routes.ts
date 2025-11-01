import { Router } from 'express'
import { createInviteController } from '../controllers/invitations/createInvite.controller'
import { listInvitesController } from '../controllers/invitations/listInvites.controller'
import { listUserInvitesController } from '../controllers/invitations/listUserInvites.controller'
import { acceptInviteController } from '../controllers/invitations/acceptInvite.controller'
import { declineInviteController } from '../controllers/invitations/declineInvite.controller'
import auth from '../infrastructure/auth'
import { inviteLimiter } from '../infrastructure/rateLimiter'


const asyncH =
  (fn: any) =>
  (req: any, res: any, next: any) =>
    Promise.resolve(fn(req, res, next)).catch(next)

const router = Router()

router.post('/projects/:projectId/invites', auth, inviteLimiter, asyncH(createInviteController))
router.get('/projects/:projectId/invites', auth, asyncH(listInvitesController))
router.get('/invites', auth, asyncH(listUserInvitesController))
router.post('/invites/:token/accept', auth, asyncH(acceptInviteController))
router.post('/invites/accept', auth, asyncH(acceptInviteController))
router.post('/invites/:token/decline', auth, asyncH(declineInviteController))
router.post('/invites/decline', auth, asyncH(declineInviteController))

export default router
