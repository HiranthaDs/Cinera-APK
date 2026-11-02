import React from 'react';
import {Heart,Clock3} from 'lucide-react';
import {Card,EmptyState} from '../components/UI';
import {useStore} from '../lib/store';
export default function Watchlist(){
  const {saved,history}=useStore();
  const [tab,setTab]=React.useState('saved');
  const items=tab==='saved'?saved:history;
  return <div className="content-width catalog-page watchlist-page"><div className="catalog-heading"><div className="eyebrow">YOUR OWN PERSONAL COLLECTION</div><h1>My list<span>.</span></h1><p>Everything you love, all in one place. Saved locally in this browser — no account required.</p></div><div className="browse-tabs"><button className={tab==='saved'?'active':''} onClick={()=>setTab('saved')}><Heart size={17}/> Watchlist <span className="tab-counter">{saved.length}</span></button><button className={tab==='history'?'active':''} onClick={()=>setTab('history')}><Clock3 size={17}/> Continue watching <span className="tab-counter">{history.length}</span></button></div>{items.length?<div className="catalog-grid">{items.map(item=><Card item={item} key={`${item.kind}-${item.id}`}/>)}</div>:<EmptyState icon={tab==='saved'?<Heart size={34}/>:<Clock3 size={34}/>} title={tab==='saved'?'Your watchlist is empty':'Nothing watched yet'} description={tab==='saved'?'Tap the + on any title to save it here.':'Start watching something to see it appear here.'}/>}</div>;
}
