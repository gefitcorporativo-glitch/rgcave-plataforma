/* ============================================================
   gefit-auth.js  (Segurança Onda 1B, GeFit)
   Login único e acesso protegido ao banco.
   - gefitLogin(prefixo, email, senha): login pela função gefit_login (senha nunca sai do banco)
   - gefitRpc(nome, args): chama uma função do banco
   - gefitToken(prefixo): token da sessão (12 h) daquele prefixo
   Camada de compatibilidade: intercepta as chamadas antigas da API às tabelas
   *_gestores, *_leads e conteudos e as converte nas funções seguras. Assim as
   páginas antigas continuam funcionando quando o acesso direto for fechado (Onda 1C).
   Carregar ANTES de qualquer outro script da página.
   ============================================================ */
(function () {
  'use strict';
  if (window.__gefitAuth) return;
  window.__gefitAuth = true;

  var SB = 'https://irwvagffrguiljaxrzmd.supabase.co';
  var PREFIXOS = ['cave_', 'powerfit_', 'eagler_', 'endorfit_', 'hmfight_', 'axifit_'];
  var _fetch = window.fetch.bind(window);
  var _key = null; // chave pública lida do próprio pedido da página (não duplicamos a chave aqui)

  function chaveDe(init) {
    var h = (init && init.headers) || {};
    if (typeof Headers !== 'undefined' && h instanceof Headers) return h.get('apikey');
    return h.apikey || h.Apikey || null;
  }
  function tokKey(p) { return 'gefit_token:' + (p || 'base'); }
  function gefitToken(p) {
    try {
      var o = JSON.parse(localStorage.getItem(tokKey(p)) || 'null');
      if (!o || !o.t || o.exp < Date.now()) return null;
      return o.t;
    } catch (e) { return null; }
  }
  function salvarToken(p, t) {
    try { localStorage.setItem(tokKey(p), JSON.stringify({ t: t, exp: Date.now() + 11.5 * 3600e3 })); } catch (e) {}
  }
  function gefitSair(p) { try { localStorage.removeItem(tokKey(p)); } catch (e) {} }

  async function gefitRpc(nome, args) {
    var k = _key;
    if (!k) throw new Error('gefit-auth: chave pública ainda não conhecida');
    var r = await _fetch(SB + '/rest/v1/rpc/' + nome, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: k, Authorization: 'Bearer ' + k },
      body: JSON.stringify(args || {})
    });
    if (!r.ok) throw new Error(await r.text());
    var txt = await r.text();
    return txt ? JSON.parse(txt) : null;
  }

  async function gefitLogin(prefixo, email, senha) {
    var g = await gefitRpc('gefit_login', { p_prefixo: prefixo || '', p_email: email, p_senha: senha });
    if (!g) return null;
    salvarToken(prefixo || '', g.token);
    delete g.token;
    return g;
  }

  window.gefitLogin = gefitLogin;
  window.gefitRpc = gefitRpc;
  window.gefitToken = gefitToken;
  window.gefitSair = gefitSair;
  window.gefitSenhaTemporaria = function () {
    var a = 'abcdefghjkmnpqrstuvwxyz23456789', s = '', v = new Uint32Array(10);
    crypto.getRandomValues(v);
    for (var i = 0; i < 10; i++) s += a[v[i] % a.length];
    return s;
  };

  // ---------------- camada de compatibilidade ----------------
  function resp(obj, status) {
    if (status === 204 || obj === undefined) return new Response(null, { status: status === 201 ? 201 : 204 });
    return new Response(JSON.stringify(obj), {
      status: status || 200, headers: { 'Content-Type': 'application/json' }
    });
  }
  function erro(msg, status) { return resp({ message: msg, code: 'GEFIT_AUTH' }, status || 401); }
  function prefixoDe(tab, base) {
    for (var i = 0; i < PREFIXOS.length; i++) if (tab === PREFIXOS[i] + base) return PREFIXOS[i];
    return tab === base ? '' : null;
  }
  function filtros(qs) {
    var f = {};
    qs.forEach(function (v, k) { f[k] = v; });
    return f;
  }
  function decod(v) { try { return decodeURIComponent(v); } catch (e) { return v; } }
  function idsDoFiltro(f) {
    if (f.id && /^eq\./.test(f.id)) return [decod(f.id.slice(3))];
    if (f.id && /^in\.\(/.test(f.id)) return f.id.slice(4, -1).split(',').map(function (x) { return decod(x.replace(/"/g, '')); });
    return null;
  }
  async function idsPorFiltro(tab, qs) {
    var q = new URLSearchParams(qs); q.set('select', 'id');
    var r = await _fetch(SB + '/rest/v1/' + tab + '?' + q.toString(), { headers: { apikey: _key, Authorization: 'Bearer ' + _key } });
    if (!r.ok) return [];
    return (await r.json()).map(function (x) { return x.id; });
  }

  async function gestores(p, tab, metodo, url, init) {
    var qs = url.searchParams, f = filtros(qs);
    if (metodo === 'GET') {
      if (f.senha_hash && f.email) {           // login antigo: email=eq.X&senha_hash=eq.Y
        var g = await gefitLogin(p, decod(f.email.replace(/^eq\./, '')), decod(f.senha_hash.replace(/^eq\./, '')));
        return resp(g ? [g] : []);
      }
      if (f.senha_hash) return resp([]);
      var sel = (f.select || '*');
      if (sel === '*' ) sel = 'id,nome,email,academia_id,role,ativo,modulos_ativos,consultora_id,treinador_id,created_at';
      sel = sel.split(',').filter(function (c) { return c.trim() !== 'senha_hash' && c.trim() !== 'senha_bcrypt'; }).join(',');
      qs.set('select', sel);
      return _fetch(url.toString(), init);
    }
    var tok = gefitToken(p) || gefitToken('');
    if (!tok) return erro('Sessão expirada. Entre de novo.');
    var corpo = init && init.body ? JSON.parse(init.body) : {};
    if (metodo === 'POST') {
      var lista = Array.isArray(corpo) ? corpo : [corpo], criados = [];
      for (var i = 0; i < lista.length; i++) {
        var d = Object.assign({}, lista[i]); var senha = d.senha_hash; delete d.senha_hash;
        var id = await gefitRpc('gefit_criar_login', { p_token: tok, p_dados: d, p_senha: senha, p_prefixo: p });
        if (!id) return erro('Sem permissão: só o admin ou o gestor da própria academia cria acessos (senha com 8+ caracteres).', 403);
        criados.push(Object.assign(d, { id: id }));
      }
      return resp(criados, 201);
    }
    var ids = idsDoFiltro(f) || await idsPorFiltro(tab, qs);
    for (var j = 0; j < ids.length; j++) {
      var ok;
      if (metodo === 'DELETE') ok = await gefitRpc('gefit_gestor_atualizar', { p_token: tok, p_gestor_id: ids[j], p_patch: { _excluir: true }, p_prefixo: p });
      else {
        var c = Object.assign({}, corpo);
        if (c.senha_hash) { ok = await gefitRpc('gefit_trocar_senha', { p_token: tok, p_gestor_id: ids[j], p_nova: c.senha_hash }); delete c.senha_hash; if (!ok) return erro('Sem permissão para trocar esta senha.', 403); }
        delete c.senha_bcrypt;
        if (Object.keys(c).length) ok = await gefitRpc('gefit_gestor_atualizar', { p_token: tok, p_gestor_id: ids[j], p_patch: c, p_prefixo: p });
      }
      if (ok === false) return erro('Sem permissão: só o admin ou o gestor da própria academia altera acessos.', 403);
    }
    return resp(undefined, 204);
  }

  async function leads(p, tab, metodo, url, init) {
    var tok = gefitToken(p) || gefitToken('');
    var f = filtros(url.searchParams);
    if (!tok) {
      // Página pública (formulário de captação): sem leitura; gravação vai para gefit_lead_registrar,
      // que faz no banco a regra de "mesmo WhatsApp na mesma academia completa a ficha".
      if (metodo === 'GET') return resp([]);
      if (metodo === 'PATCH') return resp(undefined, 204);
      if (metodo === 'POST') {
        var lista = JSON.parse(init.body); if (!Array.isArray(lista)) lista = [lista];
        for (var i = 0; i < lista.length; i++) {
          var d = Object.assign({}, lista[i]); delete d.historico; delete d.origem_primeira; delete d.codigo;
          await gefitRpc('gefit_lead_registrar', { p_prefixo: p, p_lead: d, p_codigo_base: null });
        }
        return resp(undefined, 201);
      }
      return erro('Faça login de novo para ver os leads.');
    }
    if (metodo === 'GET') {
      var rows = await gefitRpc('gefit_leads_listar', { p_token: tok, p_prefixo: p });
      rows = (rows || []).map(function (x) { return x.gefit_leads_listar || x; });
      Object.keys(f).forEach(function (k) {               // filtros simples eq. ainda aplicados no navegador
        if (k === 'select' || k === 'order' || k === 'limit' || k === 'offset') return;
        var v = f[k]; if (/^eq\./.test(v)) { var val = decod(v.slice(3)); rows = rows.filter(function (r) { return String(r[k]) === val; }); }
      });
      return resp(rows);
    }
    if (metodo === 'PATCH') {
      var ids = idsDoFiltro(f) || [];
      await gefitRpc('gefit_leads_atualizar', { p_token: tok, p_ids: ids, p_patch: init && init.body ? JSON.parse(init.body) : {} });
      return resp(undefined, 204);
    }
    return erro('Operação não permitida em leads pela página.', 403);
  }

  async function conteudos(metodo, init) {
    var tok = gefitToken('');
    if (!tok) return erro('Somente o administrador acessa a Biblioteca de Conteúdo. Entre pelo Hub GeFit.');
    if (metodo === 'GET') {
      var rows = await gefitRpc('gefit_conteudos_listar', { p_token: tok });
      return resp((rows || []).map(function (x) { return x.gefit_conteudos_listar || x; }));
    }
    if (metodo === 'POST') {
      var corpo = JSON.parse(init.body); if (!Array.isArray(corpo)) corpo = [corpo];
      await gefitRpc('gefit_conteudos_salvar', { p_token: tok, p_itens: corpo });
      return resp(undefined, 201);
    }
    return erro('Operação não permitida.', 403);
  }

  window.fetch = async function (input, init) {
    try {
      var u = typeof input === 'string' ? input : (input && input.url) || '';
      if (u.indexOf(SB + '/rest/v1/') !== 0 || u.indexOf('/rest/v1/rpc/') > 0) return _fetch(input, init);
      var k = chaveDe(init); if (k) _key = k;
      var url = new URL(u), tab = url.pathname.split('/').pop();
      var metodo = ((init && init.method) || 'GET').toUpperCase();
      var p;
      if ((p = prefixoDe(tab, 'gestores')) !== null) return await gestores(p, tab, metodo, url, init);
      if ((p = prefixoDe(tab, 'leads')) !== null) return await leads(p, tab, metodo, url, init);
      if (tab === 'conteudos') return await conteudos(metodo, init);
    } catch (e) {
      console.error('gefit-auth', e);
      return erro(String(e && e.message || e), 500);
    }
    return _fetch(input, init);
  };
})();
