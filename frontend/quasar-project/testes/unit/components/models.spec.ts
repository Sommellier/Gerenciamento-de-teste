import { describe, it, expect } from 'vitest'
import type { Todo, Meta } from 'src/components/models'

describe('Models', () => {
  describe('Todo Interface', () => {
    it('deve criar objeto Todo válido', () => {
      const todo: Todo = {
        id: 1,
        content: 'Test Todo',
      }

      expect(todo.id).toBe(1)
      expect(todo.content).toBe('Test Todo')
    })

    it('deve criar múltiplos objetos Todo', () => {
      const todos: Todo[] = [
        { id: 1, content: 'Todo 1' },
        { id: 2, content: 'Todo 2' },
        { id: 3, content: 'Todo 3' },
      ]

      expect(todos).toHaveLength(3)
      expect(todos[0].id).toBe(1)
      expect(todos[0].content).toBe('Todo 1')
      expect(todos[1].id).toBe(2)
      expect(todos[1].content).toBe('Todo 2')
      expect(todos[2].id).toBe(3)
      expect(todos[2].content).toBe('Todo 3')
    })

    it('deve validar estrutura do Todo', () => {
      const todo: Todo = {
        id: 100,
        content: 'Long content string',
      }

      expect(typeof todo.id).toBe('number')
      expect(typeof todo.content).toBe('string')
      expect(todo.id).toBeGreaterThan(0)
      expect(todo.content.length).toBeGreaterThan(0)
    })
  })

  describe('Meta Interface', () => {
    it('deve criar objeto Meta válido', () => {
      const meta: Meta = {
        totalCount: 10,
      }

      expect(meta.totalCount).toBe(10)
    })

    it('deve criar Meta com diferentes valores', () => {
      const meta1: Meta = { totalCount: 0 }
      const meta2: Meta = { totalCount: 100 }
      const meta3: Meta = { totalCount: 1000 }

      expect(meta1.totalCount).toBe(0)
      expect(meta2.totalCount).toBe(100)
      expect(meta3.totalCount).toBe(1000)
    })

    it('deve validar estrutura do Meta', () => {
      const meta: Meta = {
        totalCount: 50,
      }

      expect(typeof meta.totalCount).toBe('number')
      expect(meta.totalCount).toBeGreaterThanOrEqual(0)
    })
  })

  describe('Uso combinado', () => {
    it('deve usar Todo e Meta juntos', () => {
      const todos: Todo[] = [
        { id: 1, content: 'Todo 1' },
        { id: 2, content: 'Todo 2' },
      ]

      const meta: Meta = {
        totalCount: 5,
      }

      expect(todos.length).toBeLessThanOrEqual(meta.totalCount)
      expect(todos).toHaveLength(2)
      expect(meta.totalCount).toBe(5)
    })

    it('deve validar tipos TypeScript', () => {
      // Este teste verifica que os tipos estão corretos
      const todo: Todo = {
        id: 1,
        content: 'Test',
      }

      const meta: Meta = {
        totalCount: 1,
      }

      // Se os tipos estiverem incorretos, o TypeScript irá reclamar
      expect(todo).toBeDefined()
      expect(meta).toBeDefined()
    })
  })
})

