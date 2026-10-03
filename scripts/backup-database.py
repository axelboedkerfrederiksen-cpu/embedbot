#!/usr/bin/env python3
"""Interactive, read-only Supabase export. Password never goes in argv or logs."""
import datetime
import getpass
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import sys
import tarfile
import tempfile

ROOT = Path(__file__).resolve().parents[1]
CLI = Path('/private/tmp/embedbot-backup-npm-cache/_npx/c34c3565ecb5471d/node_modules/@supabase/cli-darwin-arm64/bin/supabase')
DB_URL = 'postgresql://postgres.drusjxecvgtmphfgpvem@aws-1-eu-central-1.pooler.supabase.com:5432/postgres'
IMAGE = 'public.ecr.aws/supabase/postgres:17.11.0.002'
CA_FILE = ROOT / 'scripts/certs/supabase-ca-2021.crt'
CA_SHA256 = '700723581420dd1ac98fd7e9ac529f0ef210eadcaf87fc868a3ad7d114c2f3b7'


def export_error(output):
    text = output.decode(errors='replace').lower()
    if 'password authentication failed' in text:
        return 'Databasen afviste adgangskoden.'
    if 'could not translate host' in text or 'name resolution' in text:
        return 'Forbindelsesadressen kunne ikke findes.'
    if 'certificate verify failed' in text or 'root certificate' in text:
        return 'Serverens TLS-certifikat kunne ikke kontrolleres.'
    if 'permission denied' in text:
        return 'Der mangler adgang til at eksportere.'
    if 'connection refused' in text or 'timeout' in text or 'timed out' in text:
        return 'Forbindelsen til databasen kunne ikke oprettes.'
    return 'Backupværktøjet stoppede. Fejlkategori er endnu ukendt.'


def main():
    os.umask(0o077)
    if not CLI.is_file():
        raise RuntimeError('Backupværktøjet mangler. Klargør Supabase CLI 2.119.0 først.')
    if not CA_FILE.is_file() or hashlib.sha256(CA_FILE.read_bytes()).hexdigest() != CA_SHA256:
        raise RuntimeError('Det kontrollerede Supabase-certifikat mangler eller er ændret.')
    docker = subprocess.run(['docker', 'info'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    if docker.returncode:
        raise RuntimeError('Docker skal være startet, før backupen kan tages.')
    subprocess.run(['node', '--version'], check=True, stdout=subprocess.DEVNULL)
    version = subprocess.run([str(CLI), '--version'], capture_output=True)
    if version.returncode or version.stdout.strip() != b'2.119.0':
        raise RuntimeError('Backupværktøjet kunne ikke startes med den forventede version.')
    image = subprocess.run(['docker', 'image', 'inspect', IMAGE], capture_output=True)
    if image.returncode:
        raise RuntimeError('Den kontrollerede PostgreSQL-container mangler. Klargør den først.')
    password = getpass.getpass('Indtast databaseadgangskoden (skjult): ')
    if not password:
        raise RuntimeError('Ingen adgangskode indtastet. Intet er ændret.')
    env = dict(os.environ, PGPASSWORD=password, PGSSLMODE='verify-full', PGSSLROOTCERT='/certs/supabase-ca.crt')
    private = ROOT / '.backups'
    private.mkdir(mode=0o700, exist_ok=True)
    os.chmod(private, 0o700)
    with tempfile.TemporaryDirectory(prefix='pending-', dir=private) as directory:
        temp = Path(directory)
        jobs = [
            ('roles.sql', ['--role-only']),
            ('schema.sql', []),
            ('data.sql', ['--data-only', '--use-copy', '--exclude', 'storage.buckets_vectors,storage.vector_indexes']),
            ('migration-schema.sql', ['--schema', 'supabase_migrations']),
            ('migration-data.sql', ['--schema', 'supabase_migrations', '--data-only', '--use-copy']),
        ]
        for filename, options in jobs:
            print('Eksporterer ' + filename + ' …', flush=True)
            # Generate Supabase's dump/filter script without any credential.
            # --db-url ignores SUPABASE_DB_PASSWORD in CLI 2.119.0; instead pass
            # PGPASSWORD to the dump container, with no secret in argv/stdin.
            recipe = subprocess.run([str(CLI), 'db', 'dump', '--db-url', DB_URL,
                                     '--dry-run', *options], capture_output=True)
            if recipe.returncode:
                raise RuntimeError('Eksportinstruktionen kunne ikke klargøres for ' + filename)
            script = recipe.stdout.decode()
            script, replaced = re.subn(r'^export PGPASSWORD=.*\n', '', script, flags=re.MULTILINE)
            if replaced != 1 or 'PGPASSWORD' in script or 'pg_dump' not in script:
                raise RuntimeError('Eksportinstruktionen har ændret format. Kørslen er stoppet sikkert.')
            with (temp / filename).open('xb') as dump:
                result = subprocess.run(['docker', 'run', '--rm', '-i',
                                         '--mount', 'type=bind,source=' + str(CA_FILE) + ',target=/certs/supabase-ca.crt,readonly',
                                         '--env', 'PGPASSWORD', '--env', 'PGSSLMODE',
                                         '--env', 'PGSSLROOTCERT', IMAGE, '/bin/bash', '-s'],
                                        input=script.encode(), env=env, stdout=dump,
                                        stderr=subprocess.PIPE)
            if result.returncode:
                # CLI diagnostics can include connection strings/passwords. Never display them.
                raise RuntimeError('Eksporten fejlede ved ' + filename + ': ' + export_error(result.stderr)
                                   + ' Ingen færdig backup er gemt. Fejlkode: ' + str(result.returncode))
            if not (temp / filename).is_file() or (temp / filename).stat().st_size == 0:
                raise RuntimeError('Eksporten gav en tom fil: ' + filename)
        env.pop('PGPASSWORD', None)
        password = None
        shutil.copytree(ROOT / 'supabase' / 'migrations', temp / 'project-migrations')
        manifest = {'createdAt': datetime.datetime.now(datetime.timezone.utc).isoformat(),
                    'project': 'drusjxecvgtmphfgpvem', 'cliVersion': '2.119.0',
                    'restoreTested': False, 'storageFilesIncluded': False,
                    'settingsAndApplicationSecretsIncluded': False,
                    'note': 'Separate logical dumps; not one cross-file snapshot. Supabase-managed schema customizations require separate review.',
                    'files': {str(p.relative_to(temp)): {'bytes': p.stat().st_size,
                              'sha256': hashlib.sha256(p.read_bytes()).hexdigest()}
                              for p in temp.rglob('*') if p.is_file()}}
        (temp / 'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2))
        archive = temp / 'archive.tar.gz'
        with tarfile.open(archive, 'w:gz') as tar:
            for p in sorted(temp.iterdir()):
                if p != archive:
                    tar.add(p, arcname=p.name)
        key = private / 'recovery-key.bin'
        if not key.exists():
            with key.open('xb') as stream:
                stream.write(os.urandom(32))
        if key.stat().st_size != 32:
            raise RuntimeError('Gendannelsesnøglen har forkert størrelse.')
        os.chmod(key, 0o600)
        stamp = datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%S%fZ')
        output = private / ('embedbot-' + stamp + '.backup.enc')
        encrypt = """const fs=require('fs'),c=require('crypto');
const [src,keyPath,dst]=process.argv.slice(1),key=fs.readFileSync(keyPath),iv=c.randomBytes(12);
const cipher=c.createCipheriv('aes-256-gcm',key,iv);
const data=Buffer.concat([cipher.update(fs.readFileSync(src)),cipher.final()]);
const envelope=Buffer.concat([Buffer.from('EBK1'),iv,cipher.getAuthTag(),data]);
fs.writeFileSync(dst,envelope,{mode:0o600,flag:'wx'});
const check=c.createDecipheriv('aes-256-gcm',key,iv);check.setAuthTag(envelope.subarray(16,32));
const plain=Buffer.concat([check.update(envelope.subarray(32)),check.final()]);
if(!plain.equals(fs.readFileSync(src)))throw new Error('Encryption verification failed');"""
        subprocess.run(['node', '-e', encrypt, str(archive), str(key), str(output)], check=True)
        print('Krypteret backup gemt: ' + str(output), flush=True)
        print('Gendannelsesnøgle: ' + str(key), flush=True)
        print('Krypteringen er kontrolleret. Databasegendannelse er endnu ikke testet.', flush=True)


if __name__ == '__main__':
    try:
        main()
    except (KeyboardInterrupt, EOFError):
        print('\nBackup afbrudt. Databasen er ikke ændret.', file=sys.stderr)
        sys.exit(1)
    except Exception as error:
        # Do not echo third-party exceptions that may contain credentials.
        message = str(error) if isinstance(error, RuntimeError) else 'Backupen kunne ikke færdiggøres.'
        print('STOPPET: ' + message, flush=True)
        sys.exit(1)
