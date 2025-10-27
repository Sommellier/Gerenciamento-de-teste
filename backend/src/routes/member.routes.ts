import { Router } from 'express'
import { addMemberByEmailController } from '../controllers/members/addMemberByEmail.controller'
import { listMembersController } from '../controllers/members/listMembers.controller'
import { updateMemberRoleController } from '../controllers/members/updateMemberRole.controller'
import { removeMemberController } from '../controllers/members/removeMember.controller'
import { auth } from '../infrastructure/auth'
import { prisma } from '../infrastructure/prisma'


const asyncH =
  (fn: any) =>
  (req: any, res: any, next: any) =>
    Promise.resolve(fn(req, res, next)).catch(next)

const router = Router()

// Rotas com auth
router.post('/projects/:projectId/members/by-email', auth, asyncH(addMemberByEmailController))
router.put('/projects/:projectId/members/:userId/role', auth, asyncH(updateMemberRoleController))
router.delete('/projects/:projectId/members/:userId', auth, asyncH(removeMemberController))

// Rota para listar membros do projeto
router.get('/projects/:projectId/members', auth, asyncH(listMembersController))

// Rota temporária sem auth para debug (para verificar dados reais)
router.get('/projects/:projectId/members-debug', async (req: any, res: any) => {
  try {
    const { projectId } = req.params
    console.log('Debug members route called for project:', projectId)
    
    // Buscar dados reais do banco
    const project = await prisma.project.findUnique({
      where: { id: Number(projectId) },
      select: { 
        id: true,
        ownerId: true,
        owner: {
          select: { id: true, name: true, email: true }
        }
      },
    })
    
    if (!project) {
      return res.status(404).json({ message: 'Projeto não encontrado' })
    }
    
    // Buscar membros do projeto
    const members = await prisma.userOnProject.findMany({
      where: { projectId: Number(projectId) },
      select: {
        projectId: true,
        userId: true,
        role: true,
        user: { select: { id: true, name: true, email: true } },
      },
    })
    
    // Adicionar o owner se não estiver na lista
    const ownerInList = members.find(item => item.userId === project.ownerId)
    if (!ownerInList) {
      members.unshift({
        projectId: project.id,
        userId: project.owner.id,
        role: 'OWNER' as any,
        user: project.owner
      })
    }
    
    res.json({ items: members })
  } catch (err) {
    console.error('Error in debug members route:', err)
    res.status(500).json({ message: 'Erro interno do servidor' })
  }
})

export default router
