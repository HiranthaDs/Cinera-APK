const FOCUSABLE='a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';
const TV_USER_AGENT=/Android TV|GoogleTV|SMART-TV|HbbTV|NetCast|Web0S|Tizen|BRAVIA|SHIELD Android TV|AFT[A-Z0-9]+|CrKey|Roku/i;
const REMOTE_KEYS={
  4:'BrowserBack',13:'Enter',19:'ArrowUp',20:'ArrowDown',21:'ArrowLeft',22:'ArrowRight',23:'Enter',
  37:'ArrowLeft',38:'ArrowUp',39:'ArrowRight',40:'ArrowDown',415:'MediaPlay',
};
let initialized=false;

export const normalizeRemoteKey=event=>{
  const key=event?.key;
  if(key&&key!=='Unidentified'){
    if(key==='Left')return 'ArrowLeft';
    if(key==='Right')return 'ArrowRight';
    if(key==='Up')return 'ArrowUp';
    if(key==='Down')return 'ArrowDown';
    if(key==='Select'||key==='Accept')return 'Enter';
    if(key==='GoBack'||key==='Escape')return key==='GoBack'?'BrowserBack':'Escape';
    return key;
  }
  return REMOTE_KEYS[event?.keyCode||event?.which]||'';
};

export const detectTvIdentity=({userAgent='',tvQuery=false}={})=>tvQuery||TV_USER_AGENT.test(userAgent);

export const detectTvDevice=({userAgent='',width=0,height=0,coarse=false,tvQuery=false}={})=>{
  if(detectTvIdentity({userAgent,tvQuery}))return true;
  return coarse&&width>=800&&width>height*1.35;
};

const visible=element=>{
  const rect=element.getBoundingClientRect();
  const style=getComputedStyle(element);
  return rect.width>0&&rect.height>0&&style.visibility!=='hidden'&&style.display!=='none'&&Number(style.opacity)!==0&&!element.closest('[aria-hidden="true"],[inert]');
};

const onScreen=element=>{
  const rect=element.getBoundingClientRect();
  return rect.bottom>0&&rect.right>0&&rect.top<window.innerHeight&&rect.left<window.innerWidth;
};

export function initializeTvNavigation(){
  if(initialized||typeof window==='undefined')return;
  initialized=true;
  const applyTvClass=()=>{
    const tvQuery=new URLSearchParams(window.location.search).get('tv')==='1';
    const coarse=window.matchMedia?.('(hover: none) and (pointer: coarse)').matches||false;
    const tvIdentity=detectTvIdentity({userAgent:navigator.userAgent,tvQuery});
    const isTv=detectTvDevice({userAgent:navigator.userAgent,width:window.innerWidth,height:window.innerHeight,coarse,tvQuery});
    document.documentElement.classList.toggle('tv-ui',isTv);
    document.documentElement.classList.toggle('tv-device',tvIdentity);
  };
  applyTvClass();
  window.addEventListener('resize',applyTvClass,{passive:true});
  window.addEventListener('pointerdown',()=>document.documentElement.classList.remove('remote-input'),{passive:true});
  window.addEventListener('keydown',event=>{
    const key=normalizeRemoteKey(event);
    document.documentElement.classList.add('remote-input');
    if(key==='Enter'&&(!event.key||event.key==='Unidentified')&&document.activeElement?.matches?.('button,a[href]')){
      event.preventDefault();
      document.activeElement.click();
      return;
    }
    if(event.defaultPrevented||!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(key))return;
    const active=document.activeElement;
    if(active?.matches('input,select,textarea,[contenteditable="true"]')||active?.closest('[data-native-arrows="true"]'))return;
    const navigationRoot=document.querySelector('[role="dialog"][aria-modal="true"]')||document.querySelector('.menu-panel.is-open')||document;
    const candidates=[...navigationRoot.querySelectorAll(FOCUSABLE)].filter(element=>visible(element)&&!element.matches('.skip-link'));
    if(!candidates.length)return;
    if(!active||!candidates.includes(active)){
      event.preventDefault();
      const first=navigationRoot.querySelector('[data-tv-autofocus]')||candidates.find(onScreen)||candidates[0];
      first.focus({preventScroll:true});
      first.scrollIntoView({block:'nearest',inline:'nearest'});
      return;
    }
    const origin=active.getBoundingClientRect();
    const ox=origin.left+origin.width/2,oy=origin.top+origin.height/2;
    const vertical=key==='ArrowUp'||key==='ArrowDown';
    const positive=key==='ArrowRight'||key==='ArrowDown';
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
    const reduced=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    best.scrollIntoView({block:'nearest',inline:'nearest',behavior:reduced?'auto':'smooth'});
  });
}
