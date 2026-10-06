import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {webcrypto} from 'node:crypto';
const source=await readFile(new URL('../public/widget.js',import.meta.url),'utf8');
async function widget(config){
 const ids=new Map(),created=[],storageCalls=[],requests=[];
 class Element{
  constructor(tag){this.tagName=tag;this.children=[];this.attributes={};this.style={setProperty(k,v){this[k]=v;}};this.classList={add(){},remove(){},toggle(){},contains(){return false;}};this.textContent='';created.push(this);}
  set innerHTML(value){this.html=value;for(const match of value.matchAll(/<(\w+)[^>]*id="([^"]+)"[^>]*>([^<]*)/g)){const element=new Element(match[1]);element.id=match[2];element.textContent=match[3];ids.set(element.id,element);}}
  get innerHTML(){return this.html||'';}
  replaceChildren(){this.children=[];}
  appendChild(el){el.parentNode=this;this.children.push(el);if(el.id)ids.set(el.id,el);return el;}
  append(...els){els.forEach(el=>this.appendChild(el));} querySelector(selector){return this.children.find(el=>el.className===selector.slice(1))||null;} insertBefore(el,before){el.parentNode=this;this.children.splice(this.children.indexOf(before),0,el);}
  addEventListener(){} setAttribute(k,v){this.attributes[k]=v;} getAttribute(k){return this.attributes[k]??null;} removeAttribute(k){delete this.attributes[k];} focus(){} querySelectorAll(){return [];} remove(){}
 }
 const script=new Element('script');script.src='https://embedbot.example/widget.js?id=11111111-1111-1111-1111-111111111111';script.attributes={'data-name':'Custom','data-hide-ai':'true'};
 const document={currentScript:script,createElement:tag=>new Element(tag),createTextNode:text=>({textContent:text}),getElementById:id=>ids.get(id),head:new Element('head'),body:new Element('body'),addEventListener(){}};
 const window={innerWidth:390,innerHeight:844,addEventListener(){},requestAnimationFrame:fn=>fn(),matchMedia:()=>({matches:false}),location:{origin:'https://shop.example',pathname:'/',href:'https://shop.example/?private=never-store'},localStorage:{getItem:key=>{storageCalls.push(key);throw new Error('No persistent storage');},setItem:key=>storageCalls.push(key)}};
 const context=vm.createContext({document,window,URL,crypto:webcrypto,console,TextDecoder,TextEncoder,AbortController,setTimeout,clearTimeout,fetch:async(url,options)=>{requests.push({url,body:options?.body?JSON.parse(options.body):null});return {ok:true,json:async()=>options?.method==="POST"?{success:true}:config};},localStorage:window.localStorage,requestAnimationFrame:fn=>fn(),navigator:{language:'da-DK'}});
 vm.runInContext(source.replace('  loadWidgetConfig();', '  window.renderCommerce = renderCommerce; window.inspectChat = () => ({history: conversationHistory, references: conversationReferences, session: commerceSession});\n  loadWidgetConfig();'),context);await new Promise(resolve=>setTimeout(resolve,0));return {ids,created,storageCalls,requests,inspectChat:window.inspectChat, renderCommerce:window.renderCommerce};
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

test('new chat clears visible messages, history and private references, rotates session and restores greeting',async()=>{
 const {ids,inspectChat,storageCalls}=await widget({welcome_message:'Velkommen'});
 const before=inspectChat();before.history.push({role:'user',content:'Old question'});before.references.push({id:'old',token:'synthetic'});
 ids.get('eb-messages').appendChild({textContent:'Old answer'});ids.get('eb-input').value='Unsent draft';
 assert.equal(ids.get('eb-new-chat').textContent,'Ny chat');ids.get('eb-new-chat').onclick();
 const after=inspectChat();assert.notEqual(after.session,before.session);assert.equal(after.references.length,0);
 assert.deepEqual(JSON.parse(JSON.stringify(after.history)),[{role:'assistant',content:'Velkommen'}]);
 assert.equal(ids.get('eb-input').value,'');assert.ok(!ids.get('eb-messages').children.some(el=>el.textContent==='Old answer'));assert.equal(storageCalls.length,0);
});

test('commerce cards show safe product images and natural stock copy without unsolicited support',async()=>{
 const {created,renderCommerce}=await widget({});
 const target=created.find(el=>el.tagName==='div');
 renderCommerce(target,{kind:'products',text:'Her er produktet',products:[{name:'Snowboard',description:'',image:'https://cdn.shopify.com/snowboard.jpg',url:'https://shop.example/products/snowboard',price:'699.95',currency:'USD',stock:50,available:true,variantsComplete:true}],fetchedAt:new Date().toISOString(),cacheSeconds:30});
 assert.ok(created.some(el=>el.tagName==='img'&&el.src==='https://cdn.shopify.com/snowboard.jpg'&&el.alt==='Snowboard'));
 assert.ok(created.some(el=>el.textContent.includes('På lager · 50 stk.')));
 assert.ok(created.some(el=>el.textContent==='Pris og lager er tjekket i webshoppen.'));
 assert.ok(!created.some(el=>el.textContent.includes('sekunder gamle')||el.textContent==='Opret en supportsag'));
});

test('production widget shows owner-selected starters with an empty welcome, records installation, and submits a quote only after review',async()=>{
 const {ids,created,requests}=await widget({workspace_enabled:true,welcome_message:'',start_buttons:[{id:'starter-one',label:'Our question',message:'Ask this',path:''}],quote_enabled:true,quote_label:'Ask for a quote',secondary_color:'#f4f1eb'});
 assert.ok(requests.some(r=>r.url.includes('/api/widget-config')&&r.url.includes('&path=')));
 assert.ok(requests.some(r=>r.url.includes('/api/workspace-widget')&&r.body.action==='heartbeat'&&r.body.session.length===64));
 ids.get('eb-bubble').onclick();assert.ok(created.some(el=>el.tagName==='button'&&el.textContent==='Our question'));
 const quote=created.find(el=>el.tagName==='button'&&el.textContent==='Ask for a quote');assert.ok(quote);quote.onclick();
 const form=created.find(el=>el.tagName==='form'&&el.className==='eb-local-quote');assert.ok(form);
 const labels=form.children.filter(el=>el.tagName==='label');labels[0].children[0].value='I would like a quote for an office';labels[1].children[0].value='example@example.org';labels[2].children[0].value='5000';labels[3].children[0].value='Next month';
 await form.onsubmit({preventDefault(){}});assert.equal(requests.filter(r=>r.body?.action==='lead_create').length,0);
 await form.onsubmit({preventDefault(){}});const submitted=requests.find(r=>r.body?.action==='lead_create');assert.equal(submitted.body.budget,'5000');assert.equal(submitted.body.timing,'Next month');assert.equal(submitted.body.business_id,'11111111-1111-1111-1111-111111111111');assert.match(submitted.body.submission_key,/^[0-9a-f-]{36}$/);
 assert.ok(created.some(el=>el.textContent==='Din henvendelse er gemt hos virksomheden.'));
});
