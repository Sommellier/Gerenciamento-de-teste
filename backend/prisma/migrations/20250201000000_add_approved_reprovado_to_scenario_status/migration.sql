-- IMPORTANTE: Os novos valores do enum ScenarioStatus (APPROVED, REPROVED)
-- devem ser adicionados MANUALMENTE antes de executar esta migration, pois
-- ALTER TYPE ... ADD VALUE não pode ser executado dentro de transação.
--
-- Execute estes comandos no banco de dados ANTES de rodar esta migration:
-- ALTER TYPE "ScenarioStatus" ADD VALUE 'APPROVED';
-- ALTER TYPE "ScenarioStatus" ADD VALUE 'REPROVED';

-- Esta migration apenas documenta a adição dos valores ao enum.
-- Os valores devem ser adicionados manualmente ao banco de dados antes da execução.
