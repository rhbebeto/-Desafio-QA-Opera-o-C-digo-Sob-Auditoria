'use strict';
const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { handler, nextId } = require('../src/server');

const DATA_DIR = path.join(__dirname, '..', 'data');
const CHAMADOS_PATH = path.join(DATA_DIR, 'chamados.json');
const ORIGINAL_CHAMADOS = fs.readFileSync(CHAMADOS_PATH, 'utf8');

let server;
let baseUrl;

function restoreData() {
  fs.writeFileSync(CHAMADOS_PATH, ORIGINAL_CHAMADOS, 'utf8');
}

function request(method, urlPath, rawBody = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request(`${baseUrl}${urlPath}`, { method, headers }, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => resolve({ status: res.statusCode, raw: data, json: data ? JSON.parse(data) : null }));
    });
    req.on('error', reject);
    if (rawBody !== null) req.write(rawBody);
    req.end();
  });
}

before(async () => {
  server = http.createServer(handler);
  await new Promise((resolve) => server.listen(3001, '127.0.0.1', resolve));
  baseUrl = 'http://127.0.0.1:3001';
});

beforeEach(() => restoreData());

after(async () => {
  restoreData();
  await new Promise((resolve) => server.close(resolve));
});

test('REG-A01: GET /usuarios retorna usuários sem expor o campo senha', async () => {
  const res = await request('GET', '/usuarios');
  assert.equal(res.status, 200);
  assert.equal(Array.isArray(res.json), true);
  assert.equal(res.json.length, 2);
  for (const usuario of res.json) {
    assert.equal('senha' in usuario, false, `Campo senha ainda exposto para usuário id=${usuario.id}`);
    assert.ok(usuario.id && usuario.nome && usuario.email && usuario.perfil);
  }
});

test('REG-A03 (unitário): nextId gera max(id)+1 mesmo com lacunas na sequência', () => {
  assert.equal(nextId([]), 1);
  assert.equal(nextId([{ id: 1 }, { id: 3 }]), 4);
  assert.equal(nextId([{ id: 2 }, { id: 10 }, { id: 5 }]), 11);
});

test('REG-A03 (integração): DELETE /chamados/2 seguido de POST /chamados gera id=4 sem duplicação', async () => {
  const del = await request('DELETE', '/chamados/2');
  assert.equal(del.status, 200);

  const created = await request(
    'POST',
    '/chamados',
    JSON.stringify({ titulo: 'Chamado pós-exclusão', prioridade: 'media', usuarioId: 1, custo: 30 }),
    { 'content-type': 'application/json' }
  );
  assert.equal(created.status, 201);
  assert.equal(created.json.id, 4);

  const list = await request('GET', '/chamados');
  const ids = list.json.map((c) => c.id);
  assert.deepEqual(ids, [1, 3, 4]);
});
