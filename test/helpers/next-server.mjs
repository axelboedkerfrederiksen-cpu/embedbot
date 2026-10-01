export { NextRequest, NextResponse } from 'next/server.js';
import { state } from './runtime.mjs';
export function after(work) { state.jobs.push(work); }
