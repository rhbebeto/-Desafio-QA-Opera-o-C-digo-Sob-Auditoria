'use strict';
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const PORT = Number(process.env.PORT || 3000);
const ROOT = path.join(__dirname, '..', 'data');
const file = name => path.join(ROOT, name + '.json');
function read(name) { return JSON.parse(fs.readFileSync(file(name), 'utf8')); }
function write(name, value) { fs.writeFileSync(file(name), JSON.stringify(value, null, 2)); }
function send(res, code, body) { res.writeHead(code, {'content-type':'application/json; charset=utf-8', 'access-control-allow-origin':'*'}); res.end(JSON.stringify(body)); }
function body(req) { return new Promise((resolve,reject)=>{let raw='';req.on('data',c=>raw+=c);req.on('end',()=>{try{resolve(raw ? JSON.parse(raw):{});}catch(e){reject(e);}});req.on('error',reject);}); }
function nextId(rows) { return rows.length + 1; }
function allowedStatus(s) { return ['aberto','em_andamento','resolvido'].includes(s); }
function summary(rows) {
  const total=rows.length;
  return {total, abertos:rows.filter(x=>x.status==='aberto').length,
    resolvidos:rows.filter(x=>x.status==='resolvido').length,
    taxaResolucao: total ? Math.round(rows.filter(x=>x.status==='resolvido').length / total * 100) : 0,
    custoTotal:rows.reduce((a,x)=>a + Number(x.custo || 0),0),
    prioridadeAlta:rows.filter(x=>x.prioridade==='alta').length};
}
async function handler(req,res) {
  const url = new URL(req.url,'http://localhost'); const route=url.pathname; const method=req.method;
  try {
    if(method==='OPTIONS'){res.writeHead(204,{'access-control-allow-origin':'*','access-control-allow-methods':'GET,POST,PATCH,DELETE,OPTIONS','access-control-allow-headers':'content-type'});return res.end();}
    if(method==='GET' && route==='/'){return send(res,200,{sistema:'HelpDesk API',versao:'1.0',rotas:['GET /chamados','GET /chamados/:id','POST /chamados','PATCH /chamados/:id','DELETE /chamados/:id','GET /relatorios/resumo','GET /usuarios']});}
    if(method==='GET' && route==='/usuarios'){return send(res,200,read('usuarios'));}
    if(method==='GET' && route==='/chamados'){
      let rows=read('chamados'); if(url.searchParams.get('status')) rows=rows.filter(x=>x.status===url.searchParams.get('status'));
      if(url.searchParams.get('prioridade')) rows=rows.filter(x=>x.prioridade===url.searchParams.get('prioridade'));
      return send(res,200,rows);
    }
    if(method==='GET' && route==='/relatorios/resumo'){return send(res,200,summary(read('chamados')));}
    const match=route.match(/^\/chamados\/(\d+)$/);
    if(method==='GET' && match){return send(res,200,read('chamados').find(x=>x.id===Number(match[1])) || {});}
    if(method==='POST' && route==='/chamados'){
      const data=await body(req); const rows=read('chamados');
      if(!data.titulo){return send(res,400,{erro:'Título obrigatório'});}
      const item={id:nextId(rows),titulo:data.titulo,descricao:data.descricao||'',prioridade:data.prioridade||'baixa',status:data.status||'aberto',usuarioId:data.usuarioId,custo:data.custo||0};
      rows.push(item);write('chamados',rows);return send(res,201,item);
    }
    if(method==='PATCH' && match){
      const data=await body(req); const rows=read('chamados');const item=rows.find(x=>x.id===Number(match[1]));
      if(!item)return send(res,404,{erro:'Chamado não encontrado'});
      if(data.status && !allowedStatus(data.status))return send(res,400,{erro:'Status inválido'});
      Object.assign(item,data);write('chamados',rows);return send(res,200,item);
    }
    if(method==='DELETE' && match){const rows=read('chamados');write('chamados',rows.filter(x=>x.id!==Number(match[1])));return send(res,200,{mensagem:'Excluído'});}
    return send(res,404,{erro:'Rota não encontrada'});
  } catch(e) { console.error(e);return send(res,500,{erro:e.message,arquivo:__filename}); }
}
if(require.main===module){http.createServer(handler).listen(PORT,()=>console.log(`HelpDesk API em http://localhost:${PORT}`));}
module.exports={handler,summary,nextId};
