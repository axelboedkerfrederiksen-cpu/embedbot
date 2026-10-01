import { state } from './runtime.mjs';
export const resend = { emails: { send: async (message, options) => {
  state.mails.push({ message, options });
  return state.mailError ? { error: state.mailError } : { data: { id: 'mock-provider-id' } };
} } };
export class Resend { constructor() { this.emails = resend.emails; } }
