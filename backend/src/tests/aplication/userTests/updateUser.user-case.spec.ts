import 'dotenv/config'
import bcrypt from 'bcrypt'
import { describe, it, beforeEach, afterAll, expect } from '@jest/globals'

import { prisma } from '../../../infrastructure/prisma'
import { createUser } from '../../../application/use-cases/user/createUser.use-case'
import { updateUser } from '../../../application/use-cases/user/updateUser.use-case'

// --- helpers ---
const unique = (p: string) =>
  `${p}_${Date.now()}_${Math.random().toString(36).slice(2)}`

async function expectAppError<T = any>(
  promise: Promise<T>,
  status: number,
  msg?: RegExp
) {
  await expect(promise).rejects.toMatchObject({
    status,
    message: expect.any(String),
  })
  if (msg) {
    await promise.catch((e) => expect(String(e.message)).toMatch(msg))
  }
}

describe('Update User', () => {
  beforeEach(async () => {
    // Limpeza completa para evitar violações de FK intermitentes
    await prisma.passwordResetToken.deleteMany()
    await prisma.execution.deleteMany()
    await prisma.userOnProject.deleteMany()
    await prisma.testCase.deleteMany()
    await prisma.project.deleteMany()
    await prisma.user.deleteMany()
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  it('atualiza name e email', async () => {
    const user = await createUser({
      name: 'Original Name',
      email: `original_${unique('u')}@example.com`,
      password: 'originalPassword123',
    })

    const updated = await updateUser(user.id.toString(), {
      name: '  Updated Name  ',
      email: '  updated@example.com  ',
    })

    expect(updated.id).toBe(user.id)
    expect(updated.name).toBe('Updated Name') // aparado
    expect(updated.email).toBe('updated@example.com') // aparado
  })

  it('atualiza password e salva com hash (bcrypt)', async () => {
    const user = await createUser({
      name: 'Hash User',
      email: `hash_${unique('u')}@example.com`,
      password: 'initialPass123',
    })

    await updateUser(user.id.toString(), { password: 'newPassword123' })

    const userInDb = await prisma.user.findUnique({ where: { id: user.id } })
    expect(userInDb).not.toBeNull()
    expect(userInDb!.password).not.toBe('newPassword123')

    const ok = await bcrypt.compare('newPassword123', userInDb!.password)
    expect(ok).toBe(true)
  })

  it('falha se usuário não existe', async () => {
    await expectAppError(
      updateUser('-1', { name: 'Ghost' }),
      404,
      /not found|não encontrado/i
    )
  })

  it('falha se id for inválido (não numérico)', async () => {
    await expectAppError(
      updateUser('abc' as any, { name: 'X' }),
      400,
      /invalid.*id|id inválido/i
    )
  })

  it('falha se email já existir', async () => {
    const firstUser = await createUser({
      name: 'User One',
      email: `dupe_${unique('a')}@example.com`,
      password: 'pass12345',
    })

    const secondUser = await createUser({
      name: 'User Two',
      email: `dupe_${unique('b')}@example.com`,
      password: 'pass45645',
    })

    await expectAppError(
      updateUser(secondUser.id.toString(), { email: firstUser.email }),
      409,
      /email.*exist/i
    )
  })

  it('falha se name tiver caracteres inválidos (regex só letras e espaços)', async () => {
    const user = await createUser({
      name: 'Usuário Válido',
      email: `inv_${unique('u')}@example.com`,
      password: 'Password123',
    })

    await expectAppError(
      updateUser(user.id.toString(), { name: 'Ana-Maria' }), // hífen é inválido no regex atual
      400,
      /invalid name/i
    )
  })

  it('falha se name for muito curto após trim', async () => {
    const user = await createUser({
      name: 'Usuário Válido',
      email: `short_${unique('u')}@example.com`,
      password: 'Password123',
    })

    await expectAppError(
      updateUser(user.id.toString(), { name: ' A ' }), // vira "A" após trim => length 1
      400,
      /invalid name/i
    )
  })

  it('falha se name contiver apenas espaços (trim -> vazio)', async () => {
    const user = await createUser({
      name: 'Usuário Válido',
      email: `spaces_${unique('u')}@example.com`,
      password: 'Password123',
    })

    await expectAppError(
      updateUser(user.id.toString(), { name: '    ' }), // após trim => ""
      400,
      /invalid name/i
    )
  })

  it('aceita letras acentuadas e espaços em name', async () => {
    const user = await createUser({
      name: 'Usuario Valido',
      email: `accent_${unique('u')}@example.com`,
      password: 'Password123',
    })

    const updated = await updateUser(user.id.toString(), { name: 'Álvaro João' })
    expect(updated.name).toBe('Álvaro João')
  })

  it('falha se email tiver formato inválido', async () => {
    const user = await createUser({
      name: 'Formato Invalido',
      email: `fmt_${unique('u')}@example.com`,
      password: 'Password123',
    })

    await expectAppError(
      updateUser(user.id.toString(), { email: 'invalid-email' }),
      400,
      /invalid email format/i
    )
  })

  it('falha se email contiver apenas espaços (trim -> vazio -> formato inválido)', async () => {
    const user = await createUser({
      name: 'Espacos',
      email: `spaces_${unique('u')}@example.com`,
      password: 'Password123',
    })

    await expectAppError(
      updateUser(user.id.toString(), { email: '    ' }),
      400,
      /invalid email format/i
    )
  })

  it('normaliza email com trim e lowercase ao atualizar', async () => {
    const user = await createUser({
      name: 'Normalize',
      email: `norm_${unique('u')}@example.com`,
      password: 'Password123',
    })

    const updated = await updateUser(user.id.toString(), {
      email: '   UPPER.CASE@Example.COM   ',
    })

    expect(updated.email).toBe('upper.case@example.com')
  })

  it('falha se password tiver menos de 8 caracteres', async () => {
    const user = await createUser({
      name: 'Pwd Short',
      email: `pwdshort_${unique('u')}@example.com`,
      password: 'initialPass123',
    })

    await expectAppError(
      updateUser(user.id.toString(), { password: '1234567' }), // 7 chars
      400,
      /at least 8 characters/i
    )
  })

  it('aceita password com 8 caracteres (limite inferior) e salva com hash', async () => {
    const user = await createUser({
      name: 'Pwd Eight',
      email: `pwdeight_${unique('u')}@example.com`,
      password: 'initialPass123',
    })

    const newPass = 'abcd1234' // 8 chars
    await updateUser(user.id.toString(), { password: newPass })

    const userInDb = await prisma.user.findUnique({ where: { id: user.id } })
    expect(userInDb).not.toBeNull()
    expect(userInDb!.password).not.toBe(newPass)

    const ok = await bcrypt.compare(newPass, userInDb!.password)
    expect(ok).toBe(true)
  })

  it('atualiza avatar quando fornecido', async () => {
    const user = await createUser({
      name: 'Test User',
      email: `test_${unique('u')}@example.com`,
      password: 'password123',
    })

    const updated = await updateUser(user.id.toString(), {
      avatar: '/uploads/avatar.jpg'
    })

    expect(updated.id).toBe(user.id)
    expect(updated.avatar).toBe('/uploads/avatar.jpg')
  })

  it('não atualiza avatar quando undefined é fornecido', async () => {
    const user = await createUser({
      name: 'Test User',
      email: `test_${unique('u')}@example.com`,
      password: 'password123'
    })

    // Primeiro definir um avatar
    await updateUser(user.id.toString(), {
      avatar: '/uploads/old-avatar.jpg'
    })

    // Depois tentar atualizar para undefined (não deve alterar)
    const updated = await updateUser(user.id.toString(), {
      avatar: undefined
    })

    expect(updated.id).toBe(user.id)
    expect(updated.avatar).toBe('/uploads/old-avatar.jpg') // deve manter o valor anterior
  })

  it('atualiza avatar para null quando null é fornecido', async () => {
    const user = await createUser({
      name: 'Test User',
      email: `test_${unique('u')}@example.com`,
      password: 'password123'
    })

    // Primeiro definir um avatar
    await updateUser(user.id.toString(), {
      avatar: '/uploads/old-avatar.jpg'
    })

    // Depois atualizar para null
    const updated = await updateUser(user.id.toString(), {
      avatar: null as any
    })

    expect(updated.id).toBe(user.id)
    expect(updated.avatar).toBeNull()
  })
})
