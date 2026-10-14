import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {appearanceDraft, validateAppearance, APPEARANCE_PRESETS} from '../lib/widget-appearance.ts';
const source=await readFile(new URL('../public/widget.js',import.meta.url),'utf8');
const context=vm.createContext({});
vm.runInContext(source.slice(source.indexOf('  function normalizeHexColor('),source.indexOf('  const container ='))+';globalThis.styles={getBubbleTextColor,getOutlineStyle,getWidgetOpacity};',context);
const styles=context.styles;
test('outline supports fractional widths, zero opacity, numeric values and booleans',()=>{
 assert.equal(styles.getOutlineStyle({chat_outline_enabled:true,chat_outline_color:'#abc',chat_outline_width:2.5,chat_outline_opacity:0}),'2.5px solid rgba(170, 187, 204, 0)');
 assert.equal(styles.getOutlineStyle({chat_outline_enabled:'true',chat_outline_width:'0'}),'none');
 assert.equal(styles.getOutlineStyle({chat_outline_enabled:false,chat_outline_width:6}),'none');
 assert.equal(styles.getOutlineStyle({chat_outline_enabled:true,chat_outline_width:'bad',chat_outline_opacity:100}),'1px solid rgba(17, 17, 17, 1)');
 assert.equal(styles.getWidgetOpacity({widget_opacity:''}),1);
 assert.equal(styles.getWidgetOpacity({widget_opacity:40}),.4);
});
test('automatic text contrast reaches WCAG AA for a grid of brand colors',()=>{
 const luminance=hex=>{const c=hex.match(/[\da-f]{2}/gi).map(v=>parseInt(v,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return c[0]*.2126+c[1]*.7152+c[2]*.0722;};
 for(let r=0;r<=255;r+=17)for(let g=0;g<=255;g+=17)for(let b=0;b<=255;b+=17){const bg='#'+[r,g,b].map(v=>v.toString(16).padStart(2,'0')).join('');const a=luminance(bg),z=luminance(styles.getBubbleTextColor(bg));assert.ok((Math.max(a,z)+.05)/(Math.min(a,z)+.05)>=4.5,bg);}
});
test('presets preserve separate identity fields and defaults retain zero and legacy launch colors',()=>{
 for(const preset of APPEARANCE_PRESETS)assert.equal(validateAppearance(preset.values),null);
 const draft=appearanceDraft({fab_color:'#123456',chat_outline_width:0,chat_outline_opacity:0,chat_outline_enabled:true});
 assert.equal(draft.chat_icon_color,'#123456');assert.equal(draft.chat_outline_width,'0');assert.equal(draft.chat_outline_opacity,'0');assert.equal(draft.chat_outline_enabled,'true');
});
test('appearance rejects unsafe logos, invalid fonts, ranges and colors',()=>{
 for(const input of [{logo_url:'javascript:alert(1)'},{logo_data_url:'data:image/svg+xml;base64,PHN2Zz4='},{logo_url:'https://user:pass@example.com/a.png'},{logo_data_url:'data:image/png;base64,'+'A'.repeat(360000)},{primary_color:'red;background:url(x)'},{font_choice:'missing'},{chat_outline_width:'8'},{widget_opacity:'NaN'},{widget_opacity:'0'}])assert.ok(validateAppearance(input));
 assert.equal(validateAppearance({logo_data_url:'data:image/png;base64,aGVsbG8=',chat_outline_opacity:'0',chat_outline_enabled:'false'}),null);
});

test('transparent white logos receive a dark backdrop without recoloring their pixels',()=>{
 const start=source.indexOf('  function getLogoBackdrop('),end=source.indexOf('  logo.onload',start);
 const context=vm.createContext({});vm.runInContext(source.slice(start,end)+';globalThis.backdrop=getLogoBackdrop;',context);
 assert.equal(context.backdrop([255,255,255,255,0,0,0,0]),'#232321');
 assert.equal(context.backdrop([20,40,30,255,255,255,255,0]),'#ffffff');
 assert.equal(context.backdrop([0,0,0,0]),'#ffffff');
});
