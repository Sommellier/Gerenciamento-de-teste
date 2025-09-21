import { prisma } from '../../../infrastructure/prisma'
import { AppError } from '../../../utils/AppError'
import type { Role } from '@prisma/client'

export type ListMembersInput = {
  projectId: number
  requesterId: number
  roles?: Role[]                 // ex.: ['TESTER','APPROVER']
  q?: string                     // busca em name/email
  page?: number                  // default 1
  pageSize?: number              // default 20 (máx 100)
  orderBy?: 'name' | 'email' | 'role'
  sort?: 'asc' | 'desc'          // default 'asc' p/ name/email; 'asc' p/ role
}

type MemberRow = {
  projectId: number
  userId: number
  role: Role
  user: { id: number; name: string; email: string }
}

export type ListMembersResult = {
  items: MemberRow[]
  total: number
  page: number
  pageSize: number
  hasNextPage: boolean
}

function normalizeQuery(q?: string) {
  return q?.trim() || undefined
}
function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n))
}

export async function listMembers({
  projectId,
  requesterId,
  roles,
  q,
  page = 1,
  pageSize = 20,
  orderBy = 'name',
  sort,
}: ListMembersInput): Promise<ListMembersResult> {
  if (!Number.isInteger(projectId) || projectId <= 0) {
    throw new AppError('projectId inválido', 400)
  }
  if (!Number.isInteger(requesterId) || requesterId <= 0) {
    throw new AppError('requesterId inválido', 400)
  }

  // 1) projeto existe e buscar dados do owner
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { 
      id: true,
      ownerId: true,
      owner: {
        select: { id: true, name: true, email: true }
      }
    },
  })
  if (!project) throw new AppError('Projeto não encontrado', 404)

  // 2) autorização: qualquer membro pode listar
  const membership = await prisma.userOnProject.findUnique({
    where: { userId_projectId: { userId: requesterId, projectId } },
    select: { role: true },
  })
  if (!membership) throw new AppError('Acesso negado ao projeto', 403)

  // 3) filtros
  const where: any = { projectId }
  if (roles && roles.length) where.role = { in: roles }

  const query = normalizeQuery(q)
  if (query) {
    // busca por nome ou e-mail (case-insensitive)
    where.OR = [
      { user: { name: { contains: query, mode: 'insensitive' as const } } },
      { user: { email: { contains: query, mode: 'insensitive' as const } } },
    ]
  }

  // paginação
  const safePage = Math.max(1, Math.floor(page))
  const safeSize = clamp(Math.floor(pageSize), 1, 100)
  const skip = (safePage - 1) * safeSize
  const take = safeSize

  // ordenação
  const dir = sort === 'desc' ? 'desc' : 'asc'
  const orderByClause =
    orderBy === 'email'
      ? { user: { email: dir } as const }
      : orderBy === 'role'
      ? ({ role: dir } as const)
      : ({ user: { name: dir } } as const) // default: name asc

  const [items, total] = await prisma.$transaction([
    prisma.userOnProject.findMany({
      where,
      skip,
      take,
      orderBy: orderByClause,
      select: {
        projectId: true,
        userId: true,
        role: true,
        user: { select: { id: true, name: true, email: true } },
      },
    }),
    prisma.userOnProject.count({ where }),
  ])

  // O owner já está na lista se foi criado como membro do projeto
  const ownerInList = items.find(item => item.userId === project.ownerId)
  
  // Não precisamos adicionar o owner se ele já está na lista
  const finalTotal = total
  
  return {
    items: items as MemberRow[],
    total: finalTotal,
    page: safePage, // já está baseado em 1
    pageSize: safeSize,
    hasNextPage: skip + items.length < finalTotal,
  }
}
