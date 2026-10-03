import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {webcrypto} from 'node:crypto';
const source=await readFile(new URL('../public/widget.js',import.meta.url),'utf8');
async function widget(config){
 const ids=new Map(),created=[],storageCalls=[];
 class Element{
  constructor(tag){this.tagName=tag;this.children=[];this.attributes={};this.style={setProperty(k,v){this[k]=v;}};this.classList={add(){},remove(){},toggle(){},contains(){return false;}};this.textContent='';created.push(this);}
  set innerHTML(value){this.html=value;for(const match of value.matchAll(/<(\w+)[^>]*id="([^"]+)"[^>]*>([^<]*)/g)){const element=new Element(match[1]);element.id=match[2];element.textContent=match[3];ids.set(element.id,element);}}
  get innerHTML(){return this.html||'';}
  appendChild(el){this.children.push(el);if(el.id)ids.set(el.id,el);return el;}
  addEventListener(){} setAttribute(k,v){this.attributes[k]=v;} getAttribute(k){return this.attributes[k]??null;} removeAttribute(k){delete this.attributes[k];} focus(){} querySelectorAll(){return [];} remove(){}
 }
 const script=new Element('script');script.src='https://embedbot.example/widget.js?id=11111111-1111-1111-1111-111111111111';script.attributes={'data-name':'Custom','data-hide-ai':'true'};
 const document={currentScript:script,createElement:tag=>new Element(tag),createTextNode:text=>({textContent:text}),getElementById:id=>ids.get(id),head:new Element('head'),body:new Element('body'),addEventListener(){}};
 const window={innerWidth:390,innerHeight:844,addEventListener(){},requestAnimationFrame:fn=>fn(),matchMedia:()=>({matches:false}),location:{origin:'https://shop.example',pathname:'/',href:'https://shop.example/?private=never-store'},localStorage:{getItem:key=>{storageCalls.push(key);throw new Error('No persistent storage');},setItem:key=>storageCalls.push(key)}};
 const context=vm.createContext({document,window,URL,crypto:webcrypto,console,TextDecoder,TextEncoder,AbortController,setTimeout,clearTimeout,fetch:async()=>({ok:true,json:async()=>config}),localStorage:window.localStorage,requestAnimationFrame:fn=>fn(),navigator:{language:'da-DK'}});
 vm.runInContext(source,context);await new Promise(resolve=>setTimeout(resolve,0));return {ids,created,storageCalls};
}
test('real widget always discloses AI before first interaction despite custom branding; customer privacy and EmbedBot information survive config; no storage or font request',async()=>{
 const {ids,created,storageCalls}=await widget({name:'Custom Brand',hide_ai:true,show_ai:false,customer_privacy_url:'https://shop.example/privacy',font_choice:'Poppins'});
 assert.equal(ids.get('eb-ai-disclosure').textContent,'AI-assistent');assert.equal(ids.get('eb-title').textContent,'Custom Brand ChatBot');assert.equal(ids.get('eb-privacy-link').href,'https://shop.example/privacy');
 assert.ok(created.some(el=>el.innerHTML.includes('Drevet af EmbedBot')&&el.innerHTML.includes('https://www.embedbot.dk/privacy')));assert.equal(storageCalls.length,0);assert.ok(!created.some(el=>el.tagName==='link'||String(el.href).includes('fonts.googleapis')));
 // A style refresh cannot remove the permanent disclosure.
 assert.ok(ids.get('eb-bubble').onclick);ids.get('eb-bubble').onclick();assert.equal(ids.get('eb-ai-disclosure').textContent,'AI-assistent');
});
test('real widget rejects executable privacy URLs and retains safe fallback when no customer policy is configured',async()=>{
 for(const url of ['javascript:alert(1)','data:text/html,secret','https://user:pass@shop.example/privacy','']){const {ids}=await widget({customer_privacy_url:url});assert.equal(ids.get('eb-privacy-link').href,'https://www.embedbot.dk/privacy');}
});
