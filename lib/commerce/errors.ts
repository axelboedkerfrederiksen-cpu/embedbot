export class CommerceError extends Error {
  status: number;
  constructor(message: string, status = 503) { super(message); this.status = status; }
}
