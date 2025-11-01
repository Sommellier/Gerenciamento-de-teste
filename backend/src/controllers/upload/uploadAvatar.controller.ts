import type { Request, Response, NextFunction } from 'express'
import multer from 'multer'
import { uploadAvatar } from '../../application/use-cases/upload/uploadAvatar.use-case'
import { AppError } from '../../utils/AppError'
import path from 'path'
import fs from 'fs'

type AuthenticatedRequest = Request & {
  user?: { id: number; email?: string }
}

// Configuração do multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(process.cwd(), 'temp')
    // Criar diretório se não existir
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true })
    }
    cb(null, uploadPath)
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname))
  }
})

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase())
    const mimetype = allowedTypes.test(file.mimetype)

    if (mimetype && extname) {
      return cb(null, true)
    } else {
      cb(new AppError('Formato de arquivo não suportado. Use JPG, PNG, GIF ou WEBP', 400))
    }
  }
})

export const uploadMiddleware = upload.single('avatar')

export async function uploadAvatarController(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    if (!req.user?.id) {
      throw new AppError('Não autenticado', 401)
    }

    if (!req.file) {
      throw new AppError('Nenhum arquivo enviado', 400)
    }

    const result = await uploadAvatar({
      userId: req.user.id,
      filePath: req.file.path,
      originalName: req.file.originalname
    })

    res.status(200).json({
      message: 'Avatar atualizado com sucesso',
      user: result.user,
      avatarUrl: result.avatarUrl
    })
  } catch (err) {
    if (err instanceof AppError) {
      res.status(err.statusCode).json({ message: err.message })
    } else {
      next(err)
    }
  }
}
