# HelpDesk API — material de investigação

Projeto didático de uma empresa fictícia. O código e os documentos são objeto de auditoria, não referências de boas práticas.

## Execução

Requisito: Node.js 18 ou superior. Sem `npm install` e sem acesso à internet.

```bash
npm start
```

Abra `http://localhost:3000/` ou utilize Postman, Insomnia ou `curl`.

Testes disponíveis: `npm test`. **A existência de um teste não demonstra cobertura suficiente.**

## Rotas

- `GET /chamados` (filtros opcionais `status` e `prioridade`)
- `GET /chamados/:id`
- `POST /chamados`
- `PATCH /chamados/:id`
- `DELETE /chamados/:id`
- `GET /relatorios/resumo`
- `GET /usuarios`

Exemplo de criação:

```bash
curl -X POST http://localhost:3000/chamados -H "Content-Type: application/json" -d '{"titulo":"Falha no login","descricao":"Erro 500","prioridade":"alta","usuarioId":1,"custo":40}'
```

**Atenção:** os dados são persistidos em arquivos JSON. Faça cópia da pasta `data` antes dos testes ou restaure os arquivos originais. Use somente dados fictícios.

Consulte `docs/requisitos-parciais.md` e `docs/registro-operacional.md`. Eles são documentos legados, sujeitos a inconsistências.
