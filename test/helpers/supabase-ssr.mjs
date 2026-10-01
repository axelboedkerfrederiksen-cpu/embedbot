import { state } from './runtime.mjs';
export function createServerClient() { return { auth: { getUser: async () => ({ data: { user: state.user }, error: null }) } }; }
