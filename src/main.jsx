import React,{lazy,Suspense} from 'react';
import {createRoot} from 'react-dom/client';
import {BrowserRouter,Routes,Route} from 'react-router-dom';
import SiteLayout from './components/SiteLayout';
import {StoreProvider} from './lib/store';
import './styles.css';
import './hich-theme.css';

const Home=lazy(()=>import('./pages/Home'));
const Browse=lazy(()=>import('./pages/Browse'));
const Search=lazy(()=>import('./pages/Search'));
const Details=lazy(()=>import('./pages/Details'));
const Watch=lazy(()=>import('./pages/Watch'));
const Watchlist=lazy(()=>import('./pages/Watchlist'));

function PageLoader(){return <div className="route-loader" role="status"><span/><strong>Loading your next story…</strong></div>;}
function NotFound(){return <div className="content-width not-found"><h1>404</h1><p>The page you're looking for doesn't exist.</p><a className="button button-primary" href="/">Back to home</a></div>;}
function App(){return <StoreProvider><BrowserRouter><SiteLayout><Suspense fallback={<PageLoader/>}><Routes>
  <Route path="/" element={<Home/>}/>
  <Route path="/movies" element={<Browse fixedKind="movie"/>}/>
  <Route path="/series" element={<Browse fixedKind="tv"/>}/>
  <Route path="/discover" element={<Browse/>}/>
  <Route path="/search" element={<Search/>}/>
  <Route path="/title/:kind/:id" element={<Details/>}/>
  <Route path="/watch/:kind/:id" element={<Watch/>}/>
  <Route path="/watchlist" element={<Watchlist/>}/>
  <Route path="*" element={<NotFound/>}/>
</Routes></Suspense></SiteLayout></BrowserRouter></StoreProvider>;}
createRoot(document.getElementById('root')).render(<App/>);
