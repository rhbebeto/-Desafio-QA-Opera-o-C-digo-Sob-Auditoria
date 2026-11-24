# Operação Código Sob Auditoria — HelpDesk API

Auditoria técnica independente de qualidade de software (produto e processo) realizada para a disciplina **Gestão da Qualidade de Software – 2026/02** (Sistemas de Informação — UEMG Unidade Passos, Prof. Eduardo Henrique Marques Ferreira).

## Integrantes do Grupo
- **Roberto Henrique Duarte**
- **Gabriel Takatsuka**
- **João Victor Arruda**
- **Maria Fernanda Mariano**

## Estrutura do Repositório
- `Relatorio_Auditoria_HelpDesk_API.pdf` — Relatório técnico completo da auditoria (achados, testes, indicadores GQM, plano de melhoria PDCA/IDEAL, demonstração de correções e evidências).
- `helpdesk-api/` — Código-fonte da aplicação auditada com as duas correções demonstrativas (**A01** e **A03**), dados originais preservados e suítes de testes automatizados (`tests/auditoria.test.js` e `tests/regressao_correcoes.test.js`).
- `patches/correcoes_A01_A03.patch` — Diff unificado das duas correções demonstrativas.
- `evidencias/` — Logs reais de execução dos testes antes e depois das correções.

## Como Executar os Testes Localmente
Requisito: Node.js 18+ (sem dependências externas).

```bash
cd helpdesk-api
npm test
```

Para executar a suíte de auditoria ou a suíte de regressão das correções individualmente:

```bash
node --test tests/auditoria.test.js
node --test tests/regressao_correcoes.test.js
```
