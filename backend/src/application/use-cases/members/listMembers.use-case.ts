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

  // 2) autorização: verificar se o usuário é membro do projeto ou é o owner
  const isOwner = project.ownerId === requesterId
  const membership = await prisma.userOnProject.findUnique({
    where: { userId_projectId: { userId: requesterId, projectId } },
    select: { role: true },
  })
  if (!membership && !isOwner) throw new AppError('Acesso negado ao projeto', 403)

  // 3) filtros
  const where: any = { projectId }
  if (roles && roles.length) {
    where.role = { in: roles }
    // Com filtro de roles, owner NÃO deve ser incluído automaticamente
    // pois ele está armazenado no userOnProject separadamente
  } else {
    // Sem filtro de roles, incluir owner
  }

  const query = normalizeQuery(q)

  // paginação
  const safePage = Math.max(1, Math.floor(page))
  const safeSize = clamp(Math.floor(pageSize), 1, 100)
  
  const skip = (safePage - 1) * safeSize
  const take = safeSize

  // Para ordenação por nome, precisamos buscar todos os itens e paginar em JavaScript
  // para garantir ordenação case-insensitive correta
  if (orderBy === 'name') {
    const allItems = await prisma.userOnProject.findMany({
      where,
      select: {
        projectId: true,
        userId: true,
        role: true,
        user: { select: { id: true, name: true, email: true } },
      },
    })
    
    // Garantir que o owner está na lista APENAS se não houver filtro de roles
    const ownerInList = allItems.find(item => item.userId === project.ownerId)
    // Não incluir owner quando há filtro de roles (owner já está no banco como membro)
    const shouldIncludeOwner = !ownerInList && project.owner && (!roles || roles.length === 0)
    if (shouldIncludeOwner) {
      allItems.unshift({
        projectId: project.id,
        userId: project.owner.id,
        role: 'OWNER' as Role,
        user: project.owner
      })
    }
    
    // Filtrar itens que correspondem à query de busca (case-insensitive)
    let filteredItems = allItems
    if (query) {
      const lowerQuery = query.toLowerCase()
      filteredItems = allItems.filter(item => 
        item.user.name.toLowerCase().includes(lowerQuery) || 
        item.user.email.toLowerCase().includes(lowerQuery)
      )
    }
    
    // Aplicar filtro de roles se especificado
    if (roles && roles.length > 0) {
      filteredItems = filteredItems.filter(item => roles.includes(item.role))
    }
    
    // Ordenar todos os itens por nome case-insensitive
    filteredItems.sort((a, b) => {
      const comparison = a.user.name.toLowerCase().localeCompare(b.user.name.toLowerCase())
      return sort === 'desc' ? -comparison : comparison
    })
    
    // Aplicar paginação em JavaScript
    const total = filteredItems.length
    const items = filteredItems.slice(skip, skip + take)
    
    return {
      items: items as MemberRow[],
      total,
      page: safePage,
      pageSize: safeSize,
      hasNextPage: skip + items.length < total,
    }
  }

  // Para outras ordenações (email, role), usar Prisma normalmente
  // Mas precisamos buscar todos os itens para aplicar filtro case-insensitive quando há query
  if (query) {
    const allItems = await prisma.userOnProject.findMany({
      where,
      select: {
        projectId: true,
        userId: true,
        role: true,
        user: { select: { id: true, name: true, email: true } },
      },
    })
    
    // Filtrar itens que correspondem à query de busca (case-insensitive)
    const lowerQuery = query.toLowerCase()
    let filteredItems = allItems.filter(item => 
      item.user.name.toLowerCase().includes(lowerQuery) || 
      item.user.email.toLowerCase().includes(lowerQuery)
    )
    
    // Aplicar filtro de roles se especificado
    if (roles && roles.length > 0) {
      filteredItems = filteredItems.filter(item => roles.includes(item.role))
    }
    
    // Garantir que o owner está na lista APENAS se não houver filtro de roles
    const ownerInList = filteredItems.find(item => item.userId === project.ownerId)
    // Não incluir owner quando há filtro de roles (owner já está no banco como membro)
    const shouldIncludeOwner = !ownerInList && project.owner && (!roles || roles.length === 0)
    
    if (shouldIncludeOwner) {
      // Verificar se o owner atende ao filtro de busca
      if (!query || project.owner.name.toLowerCase().includes(lowerQuery) || project.owner.email.toLowerCase().includes(lowerQuery)) {
        filteredItems.unshift({
          projectId: project.id,
          userId: project.owner.id,
          role: 'OWNER' as Role,
          user: project.owner
        })
      }
    }
    
    // Ordenar
    const dir = sort === 'desc' ? 'desc' : 'asc'
    if (orderBy === 'email') {
      filteredItems.sort((a, b) => {
        const comparison = a.user.email.localeCompare(b.user.email)
        return dir === 'desc' ? -comparison : comparison
      })
    } else {
      const enumOrder = ['APPROVER', 'MANAGER', 'OWNER', 'TESTER'] as const
      filteredItems.sort((a, b) => {
        const ai = enumOrder.indexOf(a.role as typeof enumOrder[number])
        const bi = enumOrder.indexOf(b.role as typeof enumOrder[number])
        return dir === 'desc' ? bi - ai : ai - bi
      })
    }
    
    // Aplicar paginação
    const total = filteredItems.length
    const items = filteredItems.slice(skip, skip + take)
    
    return {
      items: items as MemberRow[],
      total,
      page: safePage,
      pageSize: safeSize,
      hasNextPage: skip + items.length < total,
    }
  }
  
  // Quando não há query, usar Prisma normalmente
  const dir = sort === 'desc' ? 'desc' : 'asc'
  const orderByClause =
    orderBy === 'email'
      ? { user: { email: dir } as const }
      : ({ role: dir } as const)

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

  // Garantir que o owner está na lista APENAS se não houver filtro de roles OU se ele corresponde aos filtros
  const ownerInList = items.find(item => item.userId === project.ownerId)
  // Não incluir owner quando há filtro de roles (owner já está no banco como membro)
  const shouldIncludeOwner = !ownerInList && project.owner && (!roles || roles.length === 0)
  
  let finalTotal = total
  if (shouldIncludeOwner) {
    items.unshift({
      projectId: project.id,
      userId: project.owner.id,
      role: 'OWNER' as Role,
      user: project.owner
    })
    finalTotal = total + 1
  }
  
  return {
    items: items as MemberRow[],
    total: finalTotal,
    page: safePage, // já está baseado em 1
    pageSize: safeSize,
    hasNextPage: skip + items.length < finalTotal,
  }
}
