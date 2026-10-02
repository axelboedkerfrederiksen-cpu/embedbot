import { crawlWebsite as crawl } from '../../lib/website-crawl.ts';
import { state } from './runtime.mjs';
export {productPreview} from '../../lib/website-crawl.ts';
export async function crawlWebsite(url) {
  if (!state.websiteReader) throw new Error('No website reader fixture configured');
  return crawl(url,state.websiteReader);
}
