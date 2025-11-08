# Plataforma de gerencimento de testes

Nome do Estudante: Richard Schmitz Riedo

Curso: Engenharia de Software.

# Resumo

Este documento apresenta os fundamentos teóricos e técnicos para o desenvolvimento de uma aplicação web voltada à organização, documentação e acompanhamento de cenários de teste no contexto de Quality Assurance (QA).
O objetivo principal é oferecer uma plataforma acessível, intuitiva e eficiente que permita os testadores, desenvolvedores e gestores centralizar o gerenciamento de testes manuais, promovendo rastreabilidade, controle e padronização dos processos de validação de software.

# Contexto

A garantia da qualidade (QA) é central no ciclo de vida de software, mas muitas equipes ainda gerenciam cenários de teste de forma informal (planilhas, documentos dispersos), o que prejudica rastreabilidade, colaboração e eficiência na detecção de falhas. Sua RFC propõe uma aplicação web para organizar, executar e acompanhar cenários de teste de modo centralizado, com interface intuitiva e backend integrado por API RESTful, visando padronização e visibilidade para times técnicos e gestores.

# Justificativa

Uma plataforma dedicada resolve dores recorrentes do processo de QA: falta de rastreabilidade, duplicidade e baixa visibilidade de status; além de viabilizar evidências e histórico de execuções. Ao adotar arquitetura moderna (Vue.js/Quasar no frontend, Node.js/Express no backend e PostgreSQL), a solução promove manutenção, desempenho e segurança, e cria base sólida para métricas e relatórios que apoiam decisão de produto.

# Objetivos

Objetivo Principal

Desenvolver uma aplicação web completa para planejamento, execução e acompanhamento de cenários de teste manuais, com rastreabilidade de requisitos, registro de evidências e relatórios gerenciais, de forma simples, segura e acessível.

Objetivos Específicos

* Implementar cadastro/login, recuperação de senha e sessões com JWT, criptografia de senhas e proteção de rotas via middlewares.
* Criar cenários com título, pré-condições, passos e resultados esperados; 
* Permitir upload e associação de imagens/PDF (até 5 MB por arquivo) e armazenar com integridade.
* Atribuir responsáveis e registrar resultados (aprovado, reprovado, pendente).
* Gerar relatórios filtráveis por status, responsável e projeto; preparar exportação (PDF) e dashboard com indicadores.
* Cobrir fluxos críticos (login, criação/execução de cenários, upload, relatórios) com testes unitários, integrados e E2E, integrados ao pipeline de CI/CD.
* Testabilidade e CI/CD: cobrir fluxos críticos (login, criação/execução de cenários, upload, relatórios) com testes unitários/integrados/E2E e integrar ao pipeline de CI/CD.

## Documentação adicional

> [!Note]
> ## FAQ
> [Documentação do projeto](https://github.com/Sommellier/Gerenciamento-de-teste/wiki)
