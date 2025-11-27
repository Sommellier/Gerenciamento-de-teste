import { Router } from 'express'
import { ECTController } from '../controllers/ect.controller'
import { auth } from '../infrastructure/auth'

const router = Router()
const ectController = new ECTController()

/**
 * @swagger
 * /api/scenarios/{id}/ect:
 *   post:
 *     summary: Gerar ECT (Estratégia de Casos de Teste)
 *     description: Gera uma estratégia de casos de teste para um cenário específico
 *     tags: [Execuções]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID do cenário
 *     responses:
 *       201:
 *         description: ECT gerado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 scenarioId:
 *                   type: string
 *                 status:
 *                   type: string
 *                 createdAt:
 *                   type: string
 *                   format: date-time
 *       401:
 *         description: Não autenticado
 *       403:
 *         description: Sem permissão para gerar ECT
 *       404:
 *         description: Cenário não encontrado

/**
 * @swagger
 * /api/reports/{id}/download:
 *   get:
 *     summary: Download de relatório ECT
 *     description: Faz download de um relatório ECT em formato PDF
 *     tags: [Execuções]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID do relatório
 *     responses:
 *       200:
 *         description: Arquivo PDF do relatório
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *       401:
 *         description: Não autenticado
 *       403:
 *         description: Sem permissão para baixar
 *       404:
 *         description: Relatório não encontrado

/**
 * @swagger
 * /api/reports/{id}/approve:
 *   post:
 *     summary: Aprovar relatório ECT
 *     description: Aprova um relatório ECT gerado
 *     tags: [Execuções]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID do relatório
 *     responses:
 *       200:
 *         description: Relatório aprovado com sucesso
 *       401:
 *         description: Não autenticado
 *       403:
 *         description: Sem permissão para aprovar
 *       404:
 *         description: Relatório não encontrado

/**
 * @swagger
 * /api/reports/{id}/reject:
 *   post:
 *     summary: Reprovar relatório ECT
 *     description: Reprova um relatório ECT gerado
 *     tags: [Execuções]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID do relatório
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *                 description: Motivo da reprovação
 *                 example: "Relatório incompleto"
 *     responses:
 *       200:
 *         description: Relatório reprovado com sucesso
 *       401:
 *         description: Não autenticado
 *       403:
 *         description: Sem permissão para reprovar
 *       404:
 *         description: Relatório não encontrado
 */

// POST /api/scenarios/:id/ect - Gerar ECT para um cenário
router.post('/scenarios/:id/ect', auth, ectController.generateECT.bind(ectController))

// GET /api/reports/:id/download - Download de relatório
router.get('/reports/:id/download', auth, ectController.downloadReport.bind(ectController))

// POST /api/reports/:id/approve - Aprovar relatório ECT
router.post('/reports/:id/approve', auth, ectController.approveReport.bind(ectController))

// POST /api/reports/:id/reject - Reprovar relatório ECT
router.post('/reports/:id/reject', auth, ectController.rejectReport.bind(ectController))

export default router
