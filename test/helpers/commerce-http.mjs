export { CommerceHttpError, publicAddress } from '../../lib/commerce/http.ts';
import { state } from './runtime.mjs';
export async function shopJson(...args) {
  if (!state.transport) throw new Error('No mock transport configured');
  return state.transport(...args);
}
