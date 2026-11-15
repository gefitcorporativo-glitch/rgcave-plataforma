/* ============================================================
   Ponte Hub ↔ Área do Treinador (Retenção) para o Lançamento do dia.
   Usa a mesma sessão da Retenção que o Hub abre no login do gestor
   (mesmo navegador, mesma chave de armazenamento). Só leitura do diário,
   mais as liberações de correção, que ficam no banco do Hub.
   Requer: retencao/config.js e supabase-js carregados antes.
   ============================================================ */
(function(){
  const DR={};
  let cli=null;
  DR.client=function(){if(!cli&&window.supabase&&window.APP_CONFIG)cli=window.supabase.createClient(APP_CONFIG.SUPABASE_URL,APP_CONFIG.SUPABASE_ANON,window.gfOpcoesAuth);return cli};
  DR.sessao=async function(){const c=DR.client();if(!c)return null;try{const{data:{session}}=await c.auth.getSession();return session}catch(e){return null}};
  DR.conectar=async function(email,senha){
    const c=DR.client();if(!c)return{ok:false,msg:'Sem conexão com a Área do Treinador.'};
    try{const{error}=await c.auth.signInWithPassword({email:String(email).trim().toLowerCase(),password:senha});
      return error?{ok:false,msg:'A senha não confere. A senha da Área do Treinador é a mesma do Hub; se não entrar, ela está diferente e o suporte iguala para você.'}:{ok:true}}
    catch(e){return{ok:false,msg:'Sem conexão agora. Tente de novo.'}}
  };
  // Academia do gestor conectado (na Retenção)
  DR.gestor=async function(){
    const c=DR.client(),s=await DR.sessao();if(!s)return null;
    const{data}=await c.from('gestores').select('id,nome,academia_id').eq('user_id',s.user.id).maybeSingle();
    return data||null;
  };
  DR.treinadores=async function(academiaId){
    const{data,error}=await DR.client().from('treinadores').select('id,nome,email,ativo').eq('academia_id',academiaId).order('nome');
    if(error)throw error;return data||[];
  };
  DR.diario=async function(academiaId,inicio,fim,treinadorId){
    let q=DR.client().from('diario_treinador').select('*').eq('academia_id',academiaId).gte('data',inicio).lte('data',fim);
    if(treinadorId)q=q.eq('treinador_id',treinadorId);
    const{data,error}=await q.order('data');if(error)throw error;return data||[];
  };
  // ---- contas ----
  DR.CAMPOS=[
    {k:'experiencias_iniciadas',n:'Experiências iniciadas'},
    {k:'novos_alunos',n:'Alunos novos'},
    {k:'inseridos_carteira',n:'Planners iniciados'},
    {k:'consultorias_leads',n:'Consultorias com leads',sub:true},
    {k:'consultorias_alunos',n:'Consultorias com alunos',sub:true},
    {k:'consultorias_total',n:'Consultorias (total)',calc:true},
    {k:'avaliacoes_realizadas',n:'Avaliações tecnológicas'},
    {k:'revisoes_previstas',n:'Revisões agendadas'},
    {k:'revisoes_realizadas',n:'Revisões realizadas'}
  ];
  DR.normaliza=function(r){
    const o=Object.assign({},r);
    ['experiencias_iniciadas','novos_alunos','inseridos_carteira','consultorias_leads','consultorias_alunos','consultorias_realizadas','avaliacoes_realizadas','revisoes_previstas','revisoes_realizadas'].forEach(k=>o[k]=Number(o[k]||0));
    // lançamentos antigos (antes da separação leads/alunos) contam como "com alunos"
    if(!o.consultorias_leads&&!o.consultorias_alunos&&o.consultorias_realizadas)o.consultorias_alunos=o.consultorias_realizadas;
    o.consultorias_total=o.consultorias_leads+o.consultorias_alunos;
    return o;
  };
  DR.soma=function(rows){
    const t={dias:rows.length,pedidos:0};DR.CAMPOS.forEach(c=>t[c.k]=0);
    rows.forEach(r0=>{const r=DR.normaliza(r0);DR.CAMPOS.forEach(c=>t[c.k]+=r[c.k]);if(r0.pedido_correcao)t.pedidos++});
    t.rev_pct=t.revisoes_previstas?Math.round(t.revisoes_realizadas/t.revisoes_previstas*100):null;
    t.rev_saldo=t.revisoes_realizadas-t.revisoes_previstas;
    return t;
  };
  DR.ultimoDia=function(ano,mes){return new Date(ano,mes,0).getDate()};
  DR.quinzenas=function(ano,mes){
    const m=String(mes).padStart(2,'0'),u=DR.ultimoDia(ano,mes);
    return{q1:[`${ano}-${m}-01`,`${ano}-${m}-15`],q2:[`${ano}-${m}-16`,`${ano}-${m}-${u}`],mes:[`${ano}-${m}-01`,`${ano}-${m}-${u}`]};
  };
  DR.porPeriodo=function(rows,ano,mes){
    const q=DR.quinzenas(ano,mes),f=([a,b])=>rows.filter(r=>r.data>=a&&r.data<=b);
    return{q1:DR.soma(f(q.q1)),q2:DR.soma(f(q.q2)),mes:DR.soma(f(q.mes))};
  };
  // ---- calendário: funcionamento da academia, feriados e folgas (banco do Hub) ----
  DR.DIAS=['dom','seg','ter','qua','qui','sex','sab'];
  DR.DIAS_L={dom:'Domingo',seg:'Segunda',ter:'Terça',qua:'Quarta',qui:'Quinta',sex:'Sexta',sab:'Sábado'};
  DR.FUNC_PADRAO={dom:{abre:false,ini:'',fim:''},seg:{abre:true,ini:'06:00',fim:'22:00'},ter:{abre:true,ini:'06:00',fim:'22:00'},qua:{abre:true,ini:'06:00',fim:'22:00'},qui:{abre:true,ini:'06:00',fim:'22:00'},sex:{abre:true,ini:'06:00',fim:'22:00'},sab:{abre:true,ini:'08:00',fim:'12:00'}};
  DR.iso=function(d){return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')};
  DR.hoje=function(){return DR.iso(new Date())};
  DR.diasDoPeriodo=function(inicio,fim,ateHoje){const out=[],h=DR.hoje();for(let d=new Date(inicio+'T12:00:00');DR.iso(d)<=fim;d.setDate(d.getDate()+1)){const x=DR.iso(d);if(ateHoje&&x>h)break;out.push(x)}return out};
  async function hubReq(path,opt){const h=DR.hub();const r=await fetch(`${h.url}/rest/v1/${h.px}${path}`,Object.assign({},opt,{headers:Object.assign({apikey:h.key,Authorization:'Bearer '+h.key,'Content-Type':'application/json'},(opt&&opt.headers)||{})}));if(!r.ok)throw new Error(await r.text());const t=await r.text();return t?JSON.parse(t):null}
  DR.funcionamento=async function(hubAcad){
    try{const r=await hubReq(`academias?id=eq.${encodeURIComponent(hubAcad)}&select=funcionamento`);const f=r&&r[0]&&r[0].funcionamento;return Object.assign({},DR.FUNC_PADRAO,f||{})}catch(e){return Object.assign({},DR.FUNC_PADRAO)}
  };
  DR.calendario=async function(hubAcad,inicio,fim){
    try{return await hubReq(`diario_calendario?academia_id=eq.${encodeURIComponent(hubAcad)}&data=gte.${inicio}&data=lte.${fim}&select=*`)||[]}catch(e){return[]}
  };
  DR.marcarDia=async function(o){return hubReq('diario_calendario',{method:'POST',headers:{Prefer:'return=minimal'},body:JSON.stringify(o)})};
  DR.desmarcarDia=async function(id){return hubReq(`diario_calendario?id=eq.${id}`,{method:'DELETE'})};
  // status de um dia para um treinador: trabalho | fechado | feriado | folga
  DR.statusDia=function(d,func,cal,email){
    const fer=cal.find(c=>c.data===d&&c.tipo==='feriado');if(fer)return{st:'feriado',reg:fer};
    const fol=email&&cal.find(c=>c.data===d&&c.tipo==='folga'&&String(c.treinador_email||'').toLowerCase()===String(email).toLowerCase());if(fol)return{st:'folga',reg:fol};
    const dia=DR.DIAS[new Date(d+'T12:00:00').getDay()];
    return{st:func[dia]&&func[dia].abre?'trabalho':'fechado'};
  };
  DR.diasEsperados=function(inicio,fim,func,cal,email){return DR.diasDoPeriodo(inicio,fim,true).filter(d=>DR.statusDia(d,func,cal,email).st==='trabalho')};
  DR.resumoFunc=function(func){const ab=DR.DIAS.filter(d=>func[d]&&func[d].abre);if(ab.length===7)return'todos os dias';if(ab.join()==='seg,ter,qua,qui,sex,sab')return'segunda a sábado';if(ab.join()==='seg,ter,qua,qui,sex')return'segunda a sexta';return ab.map(d=>DR.DIAS_L[d].slice(0,3).toLowerCase()).join(', ')};
  // ---- liberações de correção (banco do Hub) ----
  DR.hub=function(){return{url:APP_CONFIG.HUB_URL,key:APP_CONFIG.HUB_ANON,px:APP_CONFIG.HUB_PREFIXO}};
  DR.liberacoes=async function(email){
    const h=DR.hub();const r=await fetch(`${h.url}/rest/v1/${h.px}diario_liberacoes?treinador_email=eq.${encodeURIComponent(email)}&select=*&order=data.desc`,{headers:{apikey:h.key,Authorization:'Bearer '+h.key}});
    if(!r.ok)throw new Error(await r.text());return r.json();
  };
  DR.liberar=async function(o){
    const h=DR.hub();const r=await fetch(`${h.url}/rest/v1/${h.px}diario_liberacoes`,{method:'POST',headers:{apikey:h.key,Authorization:'Bearer '+h.key,'Content-Type':'application/json',Prefer:'return=minimal'},body:JSON.stringify(Object.assign({usado:false},o))});
    if(!r.ok)throw new Error(await r.text());
  };
  window.DR=DR;
})();
