import React,{useState} from 'react';
import {Shuffle} from 'lucide-react';
import {useNavigate} from 'react-router-dom';
import {api} from '../lib/api';

export default function SurpriseButton({className=''}){
  const navigate=useNavigate();
  const [loading,setLoading]=useState(false);
  const surprise=async()=>{
    if(loading)return;
    setLoading(true);
    try{
      const data=await api('/api/home');
      const items=[...(data.featured||[]),...(data.rows||[]).flatMap(row=>row.items||[])];
      const unique=[...new Map(items.filter(item=>item?.id&&item?.kind).map(item=>[`${item.kind}:${item.id}`,item])).values()];
      const pick=unique[Math.floor(Math.random()*unique.length)];
      if(pick)navigate(`/title/${pick.kind}/${pick.id}`);
    }finally{setLoading(false);}
  };
  return <button type="button" className={`surprise-button ${className}`} onClick={surprise} disabled={loading}><Shuffle/>{loading?'Finding a story…':'Surprise me'}</button>;
}
