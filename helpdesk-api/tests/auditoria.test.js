'use strict';
const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { handler } = require('../src/server');

const DATA_DIR = path.join(__dirname, '..', 'data');
const CHAMADOS_PATH = path.join(DATA_DIR, 'chamados.json');
const USUARIOS_PATH = path.join(DATA_DIR, 'usuarios.json');

const ORIGINAL_CHAMADOS = fs.readFileSync(CHAMADOS_PATH, 'utf8');
const ORIGINAL_USUARIOS = fs.readFileSync(USUARIOS_PATH, 'utf8');

let server;
let baseUrl;

function restoreData() {
  fs.writeFileSync(CHAMADOS_PATH, ORIGINAL_CHAMADOS, 'utf8');
  fs.writeFileSync(USUARIOS_PATH, ORIGINAL_USUARIOS, 'utf8');
}

function request(method, urlPath, rawBody = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request(`${baseUrl}${urlPath}`, { method, headers }, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        let json = null;
        try {
          json = data ? JSON.parse(data) : null;
        } catch {
          json = null;
        }
        resolve({ status: res.statusCode, headers: res.headers, raw: data, json });
      });
    });
    req.on('error', reject);
    if (rawBody !== null) {
      req.write(rawBody);
    }
    req.end();
  });
}

before(async () => {
  server = http.createServer(handler);
  await new Promise((resolve) => server.listen(3000, '127.0.0.1', resolve));
  baseUrl = 'http://127.0.0.1:3000';
});

beforeEach(() => {
  restoreData();
});

after(async () => {
  restoreData();
  await new Promise((resolve) => server.close(resolve));
});

test('CT-01 [Válido | RF-02]: GET /chamados lista todos e filtra por status=aberto', async () => {
  const all = await request('GET', '/chamados');
  const open = await request('GET', '/chamados?status=aberto');
  assert.equal(all.status, 200);
  assert.equal(all.json.length, 3);
  assert.equal(open.status, 200);
  assert.equal(open.json.length, 1);
  assert.equal(open.json[0].id, 1);
});

test('CT-02 [Válido | RF-01]: POST /chamados cria chamado válido com status 201', async () => {
  const payload = JSON.stringify({
    titulo: 'Falha VPN',
    descricao: 'Timeout ao conectar',
    prioridade: 'alta',
    usuarioId: 1,
    custo: 120
  });
  const res = await request('POST', '/chamados', payload, { 'content-type': 'application/json' });
  assert.equal(res.status, 201);
  assert.equal(res.json.id, 4);
  assert.equal(res.json.titulo, 'Falha VPN');
  assert.equal(res.json.status, 'aberto');
});

test('CT-03 [Válido | RF-03]: PATCH /chamados/1 atualiza status para em_andamento', async () => {
  const res = await request('PATCH', '/chamados/1', JSON.stringify({ status: 'em_andamento' }), {
    'content-type': 'application/json'
  });
  assert.equal(res.status, 200);
  assert.equal(res.json.status, 'em_andamento');
});

test('CT-04 [Inválido | RF-01]: POST /chamados sem título retorna 400', async () => {
  const res = await request('POST', '/chamados', JSON.stringify({ descricao: 'Sem título', prioridade: 'alta' }), {
    'content-type': 'application/json'
  });
  assert.equal(res.status, 400);
  assert.ok(res.json.erro);
});

test('CT-05 [Inválido | RF-03]: PATCH /chamados/1 com status inválido retorna 400', async () => {
  const res = await request('PATCH', '/chamados/1', JSON.stringify({ status: 'cancelado' }), {
    'content-type': 'application/json'
  });
  assert.equal(res.status, 400);
  assert.ok(res.json.erro);
});

test('CT-06 [Segurança | RNF-01]: GET /usuarios não deve expor senhas em texto puro', async () => {
  const res = await request('GET', '/usuarios');
  const exposesPassword = Array.isArray(res.json) && res.json.some((u) => 'senha' in u);
  assert.equal(exposesPassword, false, `Esperado não expor campo senha, mas obtido: ${res.raw}`);
});

test('CT-07 [Borda | RNF-03]: DELETE seguido de POST não deve gerar ID duplicado', async () => {
  await request('DELETE', '/chamados/2');
  const created = await request(
    'POST',
    '/chamados',
    JSON.stringify({ titulo: 'Novo chamado após exclusão', prioridade: 'media', usuarioId: 1, custo: 30 }),
    { 'content-type': 'application/json' }
  );
  const list = await request('GET', '/chamados');
  const ids = list.json.map((c) => c.id);
  const uniqueIds = new Set(ids);
  assert.equal(
    uniqueIds.size,
    ids.length,
    `IDs duplicados encontrados após DELETE+POST: [${ids.join(', ')}] (novo item recebeu id=${created.json.id})`
  );
});

test('CT-08 [Inválido | RNF-02]: POST /chamados com JSON malformado deve retornar 400 sem expor caminho interno', async () => {
  const res = await request('POST', '/chamados', '{titulo: quebrado', { 'content-type': 'application/json' });
  assert.equal(res.status, 400, `Esperado HTTP 400, obtido HTTP ${res.status}: ${res.raw}`);
  assert.equal('arquivo' in (res.json || {}), false, `Caminho interno exposto na resposta: ${res.raw}`);
});

test('CT-09 [Borda | RNF-02]: GET e DELETE de chamado inexistente (id=999) devem retornar 404', async () => {
  const getRes = await request('GET', '/chamados/999');
  const delRes = await request('DELETE', '/chamados/999');
  assert.equal(getRes.status, 404, `GET /chamados/999 retornou ${getRes.status} com ${getRes.raw}`);
  assert.equal(delRes.status, 404, `DELETE /chamados/999 retornou ${delRes.status} com ${delRes.raw}`);
});

test('CT-10 [Inválido | RNF-03]: PATCH /chamados/1 não deve permitir sobrescrever id nem injetar campos arbitrários', async () => {
  const res = await request(
    'PATCH',
    '/chamados/1',
    JSON.stringify({ id: 999, titulo: '', perfilInjetado: 'admin' }),
    { 'content-type': 'application/json' }
  );
  const check = await request('GET', '/chamados');
  const item1 = check.json.find((c) => c.id === 1);
  assert.ok(item1, `Chamado id=1 teve seu ID adulterado via PATCH! Resposta: ${res.raw}`);
  assert.equal('perfilInjetado' in item1, false, `Campo arbitrário injetado: ${JSON.stringify(item1)}`);
});

test('CT-11 [Inválido | RF-01/RF-04]: POST com título em branco, prioridade/status inválidos e custo não numérico deve ser rejeitado', async () => {
  const res = await request(
    'POST',
    '/chamados',
    JSON.stringify({
      titulo: '   ',
      prioridade: 'critica_inexistente',
      status: 'qualquer_coisa',
      usuarioId: 999,
      custo: 'abc'
    }),
    { 'content-type': 'application/json' }
  );
  const resumo = await request('GET', '/relatorios/resumo');
  assert.equal(
    res.status,
    400,
    `Esperado HTTP 400, obtido HTTP ${res.status} (${res.raw}); resumo pós-inserção: ${resumo.raw}`
  );
});

test('CT-12 [Borda | RF-04]: GET /relatorios/resumo deve reportar contagem completa por situação (incluindo em_andamento)', async () => {
  const res = await request('GET', '/relatorios/resumo');
  assert.equal(res.status, 200);
  assert.equal(
    'emAndamento' in res.json || 'em_andamento' in res.json,
    true,
    `Resumo omitiu chamados em_andamento: ${res.raw}`
  );
});
