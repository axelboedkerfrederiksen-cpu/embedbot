import test from 'node:test';
import assert from 'node:assert/strict';
import { crawlWebsite, crawlUrl, websiteLinks, publicProducts, refreshProductPages, MAX_CRAWL_PAGES } from '../lib/website-crawl.ts';
import { MAX_SOURCE_TEXT } from '../lib/website-source.ts';
import { websiteIngestToken, verifyWebsiteIngestToken } from '../lib/website-ingest-token.ts';

const origin = 'https://shop.example';
const product = (name = 'Project 14 – Pindeetui', stock = 'InStock') => `<html><body><h1>${name}</h1><p>Et læderetui til dine strikkepinde.</p><script type="application/ld+json">${JSON.stringify({'@type':'Product',name,offers:{price:'299',priceCurrency:'DKK',availability:`https://schema.org/${stock}`}})}</script></body></html>`;

test('crawler follows navigation and sitemap indexes, keeps source links and product metadata', async () => {
  const requested: string[] = [];
  const routes: Record<string,string> = {
    '/': '<html><body><h1>Min butik</h1><p>Velkommen til vores kreative butik.</p><a href="/contact">Kontakt</a><a href="https://evil.example/products/x">External</a><a href="/cart?add=1">Cart</a></body></html>',
    '/sitemap.xml': '<sitemapindex><sitemap><loc>https://shop.example/products-map.xml</loc></sitemap><sitemap><loc>https://evil.example/sitemap.xml</loc></sitemap></sitemapindex>',
    '/products-map.xml': '<urlset><url><loc>https://shop.example/products/project-14</loc></url></urlset>',
    '/contact': '<html><body><h1>Kontakt</h1><p>Skriv til butikken, hvis du har spørgsmål.</p></body></html>',
    '/products/project-14': product(),
  };
  const result = await crawlWebsite(origin, async (url, options) => {
    requested.push(url);
    if (new URL(url).pathname !== '/') assert.equal(options.origin, origin);
    const html = routes[new URL(url).pathname];
    if (!html) throw new Error('not found');
    return {html,url};
  });
  assert.equal(result.pages,3);
  assert.match(result.text,/Project 14/);
  assert.match(result.text,/https:\/\/shop.example\/products\/project-14/);
  assert.match(result.text,/"availability":"https:\/\/schema.org\/InStock"/);
  assert.ok(requested.every(url => new URL(url).origin === origin));
  assert.equal(result.truncated,false);
});

test('URL discovery deduplicates tracking links and excludes private actions and downloads', () => {
  const links = websiteLinks('<a href="/products/a?utm_source=mail#x">A</a><a href="/products/a">A</a><a href="/checkout">Pay</a><a href="/products/a?variant=secret">Variant</a><a href="https://evil.example">Evil</a><a href="/file.pdf">PDF</a><form><a href="/submit">Submit</a></form>', origin);
  assert.deepEqual(links,[{url:`${origin}/products/a`,title:'A'}]);
  assert.equal(crawlUrl('http://shop.example/a',origin),null);
  assert.equal(crawlUrl('https://user:password@shop.example/a',origin),null);
  assert.equal(crawlUrl('/products/a?_pos=1&_sid=abc&_ss=r',origin),`${origin}/products/a`);
});

test('crawler bounds page count and content while reporting incomplete imports', async () => {
  const html = `<html><body><h1>Butik</h1><p>${'Beskrivelse '.repeat(3000)}</p>${Array.from({length:70},(_,i)=>`<a href="/products/p${i}">Produkt ${i}</a>`).join('')}</body></html>`;
  const result = await crawlWebsite(origin,async url => {
    if (url.endsWith('.xml')) throw new Error('not found');
    return {html,url};
  });
  assert.equal(result.pages,MAX_CRAWL_PAGES);
  assert.ok(result.text.length <= MAX_SOURCE_TEXT);
  assert.equal(result.truncated,true);
  assert.match(result.text,/Delvis import/);
});

test('broken secondary pages are partial imports; an unreadable homepage is an error',async () => {
  const result = await crawlWebsite(origin,async url => {
    if (new URL(url).pathname !== '/') throw new Error('blocked');
    return {url,html:'<html><body><p>Velkommen til den kreative butik.</p><a href="/products/broken">Broken</a></body></html>'};
  });
  assert.equal(result.pages,1); assert.equal(result.truncated,true);
  await assert.rejects(crawlWebsite(origin,async()=>{throw new Error('blocked')}));
});

test('product metadata is optional, bounded and never executes arbitrary scripts', () => {
  assert.deepEqual(publicProducts('<script>throw new Error("execute")</script><script type="application/ld+json">invalid</script>',origin),[]);
  assert.equal(publicProducts(product(),origin)[0].price,'299');
  assert.equal(publicProducts(product(),origin)[0].url,origin);
});

test('refresh uses fresh product data and keeps numeric product identifiers distinct',async () => {
  const context = [JSON.stringify({url:`${origin}/products/project-35-pindeetui`,title:'Project 35 Pindeetui'}), JSON.stringify({url:`${origin}/products/project-14`,title:'Project 14 Pindeetui'})].join('\n');
  const seen: string[]=[];
  const result = await refreshProductPages(context,'Project 14 Pindeetui',async(url,options)=>{
    seen.push(url); assert.equal(options.origin,origin);
    return {url,html:product('Project 14 – Pindeetui','OutOfStock').replace('</body>','<div>Tilbehør: kun 3 tilbage på lager!</div></body>')};
  },origin);
  assert.deepEqual(seen,[`${origin}/products/project-14`]);
  assert.match(result,/OutOfStock/);
  assert.match(result,/HENTET NU/);
  assert.doesNotMatch(result,/kun 3 tilbage/);
  assert.equal(await refreshProductPages(context,'Project 14 Pindeetui',async()=>{throw new Error('unavailable')},origin),'');
});

test('public search discovers products beyond the imported pages without fetching customer URLs',async () => {
  const seen: string[]=[];
  const result = await refreshProductPages('', 'Project 14 Pindeetui',async(url,options)=>{
    seen.push(url);assert.equal(options.origin,origin);
    if (new URL(url).pathname === '/search') return {url,html:'<html><body><a href="/products/project-14">Project 14 Pindeetui</a><a href="https://evil.example/project-14">Project 14</a></body></html>'};
    return {url,html:product()};
  },origin);
  assert.match(result,/Project 14/);
  assert.equal(seen.length,2);
  assert.ok(seen.every(url=>new URL(url).origin===origin));
});

test('internal ingestion authorization is tenant bound, short lived and rejects tampering', () => {
  const old=process.env.SUPABASE_SERVICE_KEY;
  process.env.SUPABASE_SERVICE_KEY='test-server-only-secret';
  try {
    const now=1_790_000_000_000,token=websiteIngestToken('bot-a',now);
    assert.equal(verifyWebsiteIngestToken(token,'bot-a',now),true);
    assert.equal(verifyWebsiteIngestToken(token,'bot-b',now),false);
    assert.equal(verifyWebsiteIngestToken(token,'bot-a',now+120001),false);
    assert.equal(verifyWebsiteIngestToken(token,'bot-a',now-10001),false);
    assert.equal(verifyWebsiteIngestToken(token+'x','bot-a',now),false);
  } finally {if(old) process.env.SUPABASE_SERVICE_KEY=old;else delete process.env.SUPABASE_SERVICE_KEY;}
});

test('product previews use verified product images, support CDN URLs and reject unsafe image schemes', async () => {
  const {productPreview}=await import('../lib/website-crawl.ts');
  const html = product().replace('"name":"Project 14 – Pindeetui"','"name":"Project 14 – Pindeetui","image":[{"url":"//cdn.example/project14.jpg"}]');
  assert.deepEqual(productPreview(html,`${origin}/products/project-14`),{name:'Project 14 – Pindeetui',url:`${origin}/products/project-14`,image:'https://cdn.example/project14.jpg'});
  const unsafe=html.replace('//cdn.example/project14.jpg','javascript:alert(1)');
  assert.equal(productPreview(unsafe,`${origin}/products/project-14`),null);
  const fallback='<html><head><meta property="og:image" content="/images/product.jpg"><meta property="og:type" content="product"></head><body><h1>Strikkepinde</h1></body></html>';
  assert.equal(productPreview(fallback,`${origin}/products/needles`)?.image,`${origin}/images/product.jpg`);
  assert.equal(productPreview('<html><head><meta property="og:image" content="/logo.jpg"></head><body><h1>Kontakt</h1></body></html>',`${origin}/contact`),null);
});
