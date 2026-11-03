const FOCUSABLE='a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';
let initialized=false;

const visible=element=>{
  const rect=element.getBoundingClientRect();
  const style=getComputedStyle(element);
  return rect.width>0&&rect.height>0&&style.visibility!=='hidden'&&style.display!=='none'&&!element.closest('[aria-hidden="true"],[inert]');
};

export function initializeTvNavigation(){
  if(initialized||typeof window==='undefined')return;
  initialized=true;
  window.addEventListener('keydown',event=>{
    if(event.defaultPrevented||!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key))return;
    const active=document.activeElement;
    if(active?.matches('input,select,textarea,[contenteditable="true"]')||active?.closest('[data-native-arrows="true"]'))return;
    const navigationRoot=document.querySelector('[role="dialog"][aria-modal="true"]')||document.querySelector('.menu-panel.is-open')||document;
    const candidates=[...navigationRoot.querySelectorAll(FOCUSABLE)].filter(visible);
    if(!candidates.length)return;
    if(!active||!candidates.includes(active)){
      event.preventDefault();
      candidates[0].focus({preventScroll:true});
      candidates[0].scrollIntoView({block:'nearest',inline:'nearest'});
      return;
    }
    const origin=active.getBoundingClientRect();
    const ox=origin.left+origin.width/2,oy=origin.top+origin.height/2;
    const vertical=event.key==='ArrowUp'||event.key==='ArrowDown';
    const positive=event.key==='ArrowRight'||event.key==='ArrowDown';
    let best=null,bestScore=Infinity;
    for(const candidate of candidates){
      if(candidate===active)continue;
      const rect=candidate.getBoundingClientRect();
      const dx=rect.left+rect.width/2-ox,dy=rect.top+rect.height/2-oy;
      const primary=(vertical?dy:dx)*(positive?1:-1);
      if(primary<=4)continue;
      const secondary=Math.abs(vertical?dx:dy);
      const score=primary+secondary*2+(secondary>primary*2?1000:0);
      if(score<bestScore){best=candidate;bestScore=score;}
    }
    if(!best)return;
    event.preventDefault();
    best.focus({preventScroll:true});
    best.scrollIntoView({block:'nearest',inline:'nearest',behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});
  });
}
