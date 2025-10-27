import { prisma } from '../../../infrastructure/prisma'
import { AppError } from '../../../utils/AppError'
import { promises as fs } from 'fs'
import path from 'path'

interface UploadAvatarInput {
  userId: number
  filePath: string
  originalName: string
}

export async function uploadAvatar({ userId, filePath, originalName }: UploadAvatarInput) {
  // Verificar se o usuário existe
  const user = await prisma.user.findUnique({ where: { id: userId } }) as any
  if (!user) {
    throw new AppError('Usuário não encontrado', 404)
  }

  // Validar extensão do arquivo
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp']
  const fileExtension = path.extname(originalName).toLowerCase()
  
  if (!allowedExtensions.includes(fileExtension)) {
    throw new AppError('Formato de arquivo não suportado. Use JPG, PNG, GIF ou WEBP', 400)
  }

  // Validar tamanho do arquivo (máximo 5MB)
  const stats = await fs.stat(filePath)
  const fileSizeInMB = stats.size / (1024 * 1024)
  
  if (fileSizeInMB > 5) {
    throw new AppError('Arquivo muito grande. Tamanho máximo permitido: 5MB', 400)
  }

  // Gerar nome único para o arquivo
  const timestamp = Date.now()
  const randomString = Math.random().toString(36).substring(2, 15)
  const newFileName = `avatar_${userId}_${timestamp}_${randomString}${fileExtension}`
  
  // Caminho de destino
  const uploadsDir = path.join(process.cwd(), 'uploads', 'avatars')
  const destinationPath = path.join(uploadsDir, newFileName)

  // Criar diretório se não existir
  await fs.mkdir(uploadsDir, { recursive: true })

  // Mover arquivo para o diretório de uploads
  await fs.rename(filePath, destinationPath)

  // URL relativa para salvar no banco
  const avatarUrl = `/uploads/avatars/${newFileName}`

  // Remover avatar anterior se existir
  if (user.avatar && user.avatar.startsWith('/uploads/avatars/')) {
    const oldAvatarPath = path.join(process.cwd(), user.avatar)
    try {
      await fs.unlink(oldAvatarPath)
    } catch (error) {
      // Ignorar erro se arquivo não existir
    }
  }

  // Atualizar usuário com nova URL do avatar
  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: { avatar: avatarUrl } as any
  }) as any

  return {
    user: updatedUser,
    avatarUrl
  }
}
