const {test}=require('node:test');
const assert=require('node:assert/strict');
const {summary}=require('../src/server');
test('resumo conta total de chamados',()=>assert.equal(summary([{status:'aberto',custo:10}]).total,1));
