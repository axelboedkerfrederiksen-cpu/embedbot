import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, symlinkSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

test('backup rotation inspects before applying and only deletes expired dated encrypted copies, including copied files',()=>{
 const directory=mkdtempSync(join(tmpdir(),'embedbot-backup-retention-'));
 try {
  const old=join(directory,'embedbot-20200101T000000000000Z.backup.enc');
  const fresh=join(directory,'embedbot-20990101T000000000000Z.backup.enc');
  const key=join(directory,'recovery-key.bin');
  const other=join(directory,'notes.txt');
  const link=join(directory,'embedbot-20200102T000000000000Z.backup.enc');
  for(const p of [old,fresh,key,other])writeFileSync(p,'fixture');
  symlinkSync(key,link);
  const run=(args=[])=>spawnSync('python3',['scripts/backup-retention.py','--directory',directory,...args],{encoding:'utf8'});
  const preview=run();assert.equal(preview.status,0,preview.stderr);assert.match(preview.stdout,/1 udløbne kopier/);assert.ok(existsSync(old));
  const applied=run(['--apply']);assert.equal(applied.status,0,applied.stderr);assert.equal(existsSync(old),false);
  for(const p of [fresh,key,other,link])assert.ok(existsSync(p));
  const repeated=run(['--apply']);assert.equal(repeated.status,0);assert.match(repeated.stdout,/0 udløbne kopier/);
 } finally {rmSync(directory,{recursive:true,force:true});}
});
