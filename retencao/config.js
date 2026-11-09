/* ============================================================
   CONFIG ÚNICA — é o ÚNICO arquivo a editar por cliente (white label)
   Chave publishable (sb_publishable_) é pública por natureza; segurança real = RLS + Edge Functions.
   NUNCA colocar service_role aqui.
   ============================================================ */
window.APP_CONFIG = {
  NOME_MARCA:   'RG Cave Retenção',
  SUPABASE_URL: 'https://xpvedihpejivnkssryhc.supabase.co',
  SUPABASE_ANON:'sb_publishable_hMgtFmt--Ad4_Q9fRBrPtw_8btFVJIq',
  // Cada academia guarda o login da Retenção separado (os sites ficam no mesmo endereço do GitHub)
  STORAGE_KEY:  'ret-cave',
  // Palavra que precisa estar no nome da academia (cadastro da Retenção) para o login valer neste site
  MARCA_CHAVE:  'cave'
};
window.gfOpcoesAuth = { auth: { storageKey: window.APP_CONFIG.STORAGE_KEY } };
// Trava: se o login for de outra academia, sai e avisa (nunca mostra dados de outra academia com esta marca)
window.gfConfereAcademia = async function(client, nomeAcademia){
  const norm = t => String(t||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
  const chave = norm(window.APP_CONFIG.MARCA_CHAVE);
  if(!chave || !nomeAcademia || norm(nomeAcademia).includes(chave)) return true;
  try{ if(client) await client.auth.signOut(); }catch(e){}
  ['qg90_user','qg90_treinador'].forEach(k=>{ try{ localStorage.removeItem(k); }catch(e){} });
  const marca = String(window.APP_CONFIG.NOME_MARCA||'').replace(/\s*Reten[cç][aã]o\s*$/i,'');
  const d = document.createElement('div');
  d.style.cssText = 'position:fixed;inset:0;z-index:99999;background:#0A0A0A;color:#F0F0F0;display:flex;align-items:center;justify-content:center;padding:24px;font-family:Barlow,Arial,sans-serif;text-align:center';
  d.innerHTML = '<div style="max-width:440px"><div style="font-size:40px;margin-bottom:10px">🔒</div><div style="font-size:20px;font-weight:800;margin-bottom:10px">Este acesso é de outra academia</div><div style="font-size:14.5px;line-height:1.55;color:#BBB;margin-bottom:18px">Você entrou com um login de <b style="color:#fff">'+String(nomeAcademia).replace(/</g,'&lt;')+'</b>, mas este é o sistema da <b style="color:#fff">'+marca.replace(/</g,'&lt;')+'</b>. Por segurança, a sessão foi encerrada. Abra pelo link da sua academia ou entre com o login certo.</div><a href="index.html" style="display:inline-block;background:#fff;color:#111;font-weight:800;padding:11px 20px;border-radius:10px;text-decoration:none">Entrar com outro login</a></div>';
  document.body.appendChild(d);
  return false;
};
