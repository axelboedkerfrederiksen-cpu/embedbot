export * from '../../lib/website-source.ts';
import {state} from './runtime.mjs';
export async function fetchWebsitePage(url,options){
  if(!state.websiteReader)throw new Error('No website reader fixture configured');
  return state.websiteReader(url,options);
}
