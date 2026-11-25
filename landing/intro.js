(()=>{
const T={merge:1000,beat:700,beats:2,fly:800,lift:750};
const ONCE_PER_SESSION=false; // keep false while testing
const root=document.documentElement,mark=document.querySelector('[data-titan-mark]'),ov=document.getElementById('ov');
const clear=()=>root.classList.remove('intro-nav','intro-hero','playing','locked');
if(!mark||!ov){clear();return}
const wait=ms=>new Promise(r=>setTimeout(r,ms));
let anims=[],token=0;
function end(){token++;anims.forEach(a=>{try{a.cancel()}catch(e){}});anims=[];
  mark.style.transform='';mark.style.willChange='';mark.classList.remove('merge','spin');clear()}
async function play(force){
  end();const my=token,alive=()=>my===token;
  if(matchMedia('(prefers-reduced-motion:reduce)').matches&&!force)return;
  if(ONCE_PER_SESSION&&!force&&sessionStorage.titan)return;
  root.classList.add('intro-nav','intro-hero','playing','locked');
  await Promise.race([document.fonts.ready,wait(600)]);if(!alive())return;
  mark.style.willChange='transform';
  const r=mark.getBoundingClientRect(),S=innerWidth<700?140:220,s=S/r.width;
  const dx=innerWidth/2-(r.left+r.width/2),dy=innerHeight/2-(r.top+r.height/2);
  const big=`translate(${dx}px,${dy}px) scale(${s})`;
  mark.style.transform=big;
  mark.style.setProperty('--beat',T.beat+'ms');mark.style.setProperty('--beats',T.beats);
  mark.classList.add('merge');await wait(T.merge);if(!alive())return;
  mark.classList.replace('merge','spin');await wait(T.beat*T.beats+120);if(!alive())return;
  mark.classList.remove('spin');root.classList.remove('locked');
  const fly=mark.animate([{transform:big},{transform:'translate(0,0) scale(1.14)',offset:.82},{transform:'translate(0,0) scale(1)'}],{duration:T.fly,easing:'cubic-bezier(.65,0,.35,1)'});
  mark.style.transform='';anims.push(fly);
  await wait(T.fly*.2);if(!alive())return;
  const lift=ov.animate([{transform:'translateY(0)'},{transform:'translateY(-120%)'}],{duration:T.lift,easing:'cubic-bezier(.65,0,.35,1)',fill:'forwards'});
  anims.push(lift);root.classList.remove('intro-hero');
  await wait(T.fly*.8);if(!alive())return;
  root.classList.remove('intro-nav');
  await Promise.all([fly.finished,lift.finished].map(p=>p.catch(()=>{})));if(!alive())return;
  end();if(ONCE_PER_SESSION)sessionStorage.titan='1';
}
['pointerdown','keydown','resize'].forEach(e=>addEventListener(e,()=>{if(root.classList.contains('playing'))end()},{passive:true}));
window.playTitanIntro=()=>play(true); // run playTitanIntro() in the console to replay
play();
})();
