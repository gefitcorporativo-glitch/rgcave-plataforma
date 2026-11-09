/* Quando a tela roda dentro do Hub (iframe), esconde o que o Hub já oferece: logo e botão Sair. */
(function(){ try{ if(window.self!==window.top){ document.documentElement.classList.add('gf-embed'); } }catch(e){ document.documentElement.classList.add('gf-embed'); } })();
