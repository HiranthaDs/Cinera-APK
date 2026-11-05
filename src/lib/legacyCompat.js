import 'whatwg-fetch';
import 'abortcontroller-polyfill/dist/abortcontroller-polyfill-only';
import 'url-search-params-polyfill';

// LG webOS and older Android TV browsers can load the legacy bundle while
// still missing a few DOM conveniences that Babel/core-js do not provide.
if(typeof Element!=='undefined'){
  if(!Element.prototype.matches){
    Element.prototype.matches=Element.prototype.msMatchesSelector||Element.prototype.webkitMatchesSelector;
  }
  if(!Element.prototype.closest){
    Element.prototype.closest=function closest(selector){
      let element=this;
      while(element&&element.nodeType===1){
        if(element.matches(selector))return element;
        element=element.parentElement||element.parentNode;
      }
      return null;
    };
  }
}

if(typeof window!=='undefined'&&typeof window.CustomEvent!=='function'){
  const CustomEventPolyfill=function(type,params){
    const event=document.createEvent('CustomEvent');
    event.initCustomEvent(type,Boolean(params?.bubbles),Boolean(params?.cancelable),params?.detail);
    return event;
  };
  CustomEventPolyfill.prototype=window.Event.prototype;
  window.CustomEvent=CustomEventPolyfill;
}
