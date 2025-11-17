-- IMPORTANTE: O novo valor do enum ScenarioStatus (BLOQUEADO)
-- deve ser adicionado MANUALMENTE antes de executar esta migration, pois
-- ALTER TYPE ... ADD VALUE não pode ser executado dentro de transação.
--
-- Execute este comando no banco de dados ANTES de rodar esta migration:
-- ALTER TYPE "ScenarioStatus" ADD VALUE 'BLOQUEADO';
--
-- Esta migration apenas documenta a adição do valor ao enum.
-- O valor deve ser adicionado manualmente ao banco de dados antes da execução.

