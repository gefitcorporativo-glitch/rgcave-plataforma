/* ============================================================
   Jornada guiada ("🧭 Como usar"): destaca um item por vez e explica.
   Uso: GFTour.botao(roteiro) mostra o botão fixo; GFTour.abrir(roteiro) abre;
        GFTour.primeiraVez(roteiro, chave) abre sozinho só na primeira vez (por navegador/chave).
   Roteiro: {id, passos:[{el:'seletor' | ()=>Elemento, t:'Título', x:'Texto'}], antes:()=>{} }
   ============================================================ */
(function(){
  const css=`
  .gft-btn{position:fixed;right:20px;bottom:20px;z-index:9000;background:#111;color:#FFD34D;border:1px solid rgba(245,184,0,.6);border-radius:30px;padding:10px 16px;font:700 14px 'Barlow Condensed',Barlow,Arial,sans-serif;letter-spacing:.3px;cursor:pointer;box-shadow:0 6px 22px rgba(0,0,0,.45)}
  .gft-btn:hover{background:#1a1a1a}
  .gft-ov{position:fixed;inset:0;z-index:9500}
  .gft-hole{position:fixed;border-radius:12px;box-shadow:0 0 0 9999px rgba(0,0,0,.68);outline:2px solid #F5B800;transition:all .25s ease;pointer-events:none}
  .gft-tip{position:fixed;z-index:9600;max-width:360px;width:calc(100vw - 32px);background:#141414;color:#F4F4F4;border:1px solid rgba(245,184,0,.55);border-radius:14px;padding:16px 18px;box-shadow:0 14px 40px rgba(0,0,0,.6);font:14px/1.5 Barlow,Arial,sans-serif}
  .gft-tip .p{font-size:11.5px;color:#F5B800;font-weight:700;text-transform:uppercase;letter-spacing:.8px;margin-bottom:4px}
  .gft-tip h4{font:800 19px 'Barlow Condensed',Barlow,Arial,sans-serif;margin:0 0 6px}
  .gft-tip .x{color:rgba(255,255,255,.78)}
  .gft-tip .b{display:flex;gap:8px;margin-top:14px;align-items:center}
  .gft-tip button{border-radius:9px;padding:8px 14px;font:700 14px 'Barlow Condensed',Barlow,Arial,sans-serif;cursor:pointer;border:1px solid rgba(255,255,255,.18);background:transparent;color:#F4F4F4}
  .gft-tip button.pri{background:linear-gradient(135deg,#F5B800,#FFD34D);color:#111;border:none}
  .gft-tip button.sair{margin-right:auto;border:none;color:rgba(255,255,255,.5);padding-left:0}
  .gft-dots{display:flex;gap:4px;margin-top:10px}.gft-dots i{width:6px;height:6px;border-radius:50%;background:rgba(255,255,255,.18)}.gft-dots i.on{background:#F5B800}`;
  const st=document.createElement('style');st.textContent=css;document.head.appendChild(st);
  let atual=null,idx=0,ov=null,hole=null,tip=null;
  function achar(p){try{const e=typeof p.el==='function'?p.el():document.querySelector(p.el);if(e&&e.getClientRects().length&&e.offsetParent!==null)return e}catch(x){}return null}
  function fechar(){if(ov)ov.remove();ov=hole=tip=null;document.removeEventListener('keydown',tecla);window.removeEventListener('resize',posicionar);if(atual&&atual.chave)try{localStorage.setItem(atual.chave,'1')}catch(e){}atual=null}
  function tecla(e){if(e.key==='Escape')fechar();if(e.key==='ArrowRight')ir(1);if(e.key==='ArrowLeft')ir(-1)}
  function posicionar(){
    if(!atual)return;const p=atual.passos[idx],e=achar(p);
    if(!e){hole.style.cssText+='left:50%;top:40%;width:0;height:0;';tip.style.left=Math.max(16,(innerWidth-tip.offsetWidth)/2)+'px';tip.style.top=Math.max(16,(innerHeight-tip.offsetHeight)/2)+'px';return}
    const r=e.getBoundingClientRect(),pad=6;
    hole.style.left=(r.left-pad)+'px';hole.style.top=(r.top-pad)+'px';hole.style.width=(r.width+pad*2)+'px';hole.style.height=(r.height+pad*2)+'px';
    const tw=tip.offsetWidth,th=tip.offsetHeight;let top=r.bottom+14;if(top+th>innerHeight-12)top=r.top-th-14;if(top<12)top=Math.min(innerHeight-th-12,Math.max(12,r.top+12));
    let left=r.left;if(left+tw>innerWidth-16)left=innerWidth-tw-16;if(left<16)left=16;
    tip.style.top=top+'px';tip.style.left=left+'px';
  }
  function mostrar(){
    const p=atual.passos[idx],n=atual.passos.length,e=achar(p);
    if(e){const r=e.getBoundingClientRect();if(r.top<70||r.bottom>innerHeight-40)e.scrollIntoView({block:r.height>innerHeight*.6?'start':'center'})}
    tip.innerHTML=`<div class="p">Passo ${idx+1} de ${n}</div><h4>${p.t}</h4><div class="x">${p.x}</div>
      <div class="b"><button class="sair" data-a="sair">Sair do guia</button>${idx?'<button data-a="v">Voltar</button>':''}<button class="pri" data-a="p">${idx===n-1?'Concluir':'Próximo'}</button></div>
      <div class="gft-dots">${atual.passos.map((_,i)=>`<i class="${i===idx?'on':''}"></i>`).join('')}</div>`;
    setTimeout(posicionar,e?260:0);posicionar();
  }
  function ir(d){if(!atual)return;const n=atual.passos.length;if(idx+d>=n)return fechar();if(idx+d<0)return;idx+=d;mostrar()}
  const GFTour={
    abrir(rot){
      fechar();if(rot.antes)try{rot.antes()}catch(e){}
      atual=Object.assign({},rot);idx=0;
      ov=document.createElement('div');ov.className='gft-ov';hole=document.createElement('div');hole.className='gft-hole';tip=document.createElement('div');tip.className='gft-tip';
      ov.appendChild(hole);document.body.appendChild(ov);document.body.appendChild(tip);ov.appendChild(tip);
      tip.addEventListener('click',ev=>{const a=ev.target.closest('[data-a]');if(!a)return;const k=a.dataset.a;if(k==='sair')fechar();if(k==='p')ir(1);if(k==='v')ir(-1)});
      document.addEventListener('keydown',tecla);window.addEventListener('resize',posicionar);
      setTimeout(mostrar,rot.antes?350:0);
    },
    botao(rot,txt){let b=document.getElementById('gft-btn');if(!b){b=document.createElement('button');b.id='gft-btn';b.className='gft-btn';document.body.appendChild(b)}b.textContent=txt||'🧭 Como usar';b.onclick=()=>GFTour.abrir(typeof rot==='function'?rot():rot);return b},
    primeiraVez(rot,chave){const k='gftour-'+(chave||rot.id);try{if(localStorage.getItem(k))return}catch(e){return}setTimeout(()=>GFTour.abrir(Object.assign({},rot,{chave:k})),700)},
    fechar
  };
  window.GFTour=GFTour;
})();
