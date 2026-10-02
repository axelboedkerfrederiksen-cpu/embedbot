import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';

// Execute the actual widget formatter against a minimal text-node DOM. This
// checks link safety without accepting HTML from an assistant response.
const source=await readFile(new URL('../public/widget.js',import.meta.url),'utf8');
const start=source.indexOf('  function appendFormattedText(');
const end=source.indexOf('  async function addProductPreviews(',start);
class Node {
  constructor(tag,text=''){this.tag=tag;this.textContent=text;this.children=[];}
  appendChild(child){this.children.push(child);return child;}
}
function render(text){
  const document={createElement:tag=>new Node(tag),createTextNode:text=>new Node('#text',text)};
  const context=vm.createContext({document,URL});
  vm.runInContext(source.slice(start,end)+'; globalThis.render=appendFormattedText;',context);
  const root=new Node('p');context.render(root,text);return root;
}

test('assistant Markdown links and bold text become safe DOM elements',()=>{
  const node=render('Se **produktet**: [Project 14](https://shop.example/products/p14).');
  const link=node.children.find(n=>n.tag==='a');
  assert.equal(link.textContent,'Project 14');assert.equal(link.href,'https://shop.example/products/p14');
  assert.equal(link.target,'_blank');assert.equal(link.rel,'noopener noreferrer');
  assert.equal(node.children.find(n=>n.tag==='strong').textContent,'produktet');
});
test('raw URLs are clickable and sentence punctuation stays outside the link',()=>{
  const node=render('Se https://shop.example/products/p14.');
  assert.equal(node.children.find(n=>n.tag==='a').href,'https://shop.example/products/p14');
  assert.equal(node.children.filter(n=>n.tag==='#text').map(n=>n.textContent).join(''),'Se .');
});
test('HTML and unsafe Markdown targets never become executable elements or links',()=>{
  const node=render('<img src=x onerror=alert(1)> [Bad](javascript:alert(1)) [Secret](https://user:password@shop.example/a)');
  assert.equal(node.children.some(n=>n.tag==='img'),false);
  assert.equal(node.children.some(n=>n.tag==='a'),false);
  assert.match(node.children.map(n=>n.textContent).join(''),/onerror=alert/);
});
test('incomplete streamed Markdown stays text until a full valid link arrives',()=>{
  assert.equal(render('[Project 14](https://shop.example/').children.some(n=>n.tag==='a'&&n.textContent==='Project 14'),false);
  assert.equal(render('[Project 14](https://shop.example/)').children.find(n=>n.tag==='a').textContent,'Project 14');
});
