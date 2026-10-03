#!/usr/bin/env python3
"""Inspect expired encrypted backup copies. Explicit --apply is required to delete."""
import argparse
import datetime as dt
from pathlib import Path
import re

PATTERN = re.compile(r"embedbot-(\d{8}T\d{12}Z)\.backup\.enc")
MAX_AGE = dt.timedelta(days=30)


def expired_backups(directory, now):
    result = []
    for path in sorted(directory.iterdir()):
        match = PATTERN.fullmatch(path.name)
        if not match or path.is_symlink() or not path.is_file():
            continue
        try:
            created = dt.datetime.strptime(match[1], "%Y%m%dT%H%M%S%fZ").replace(tzinfo=dt.timezone.utc)
        except ValueError:
            continue
        # Use the export timestamp, not mtime (copying changes filesystem dates).
        if created <= now - MAX_AGE:
            result.append(path)
    return result


def main():
    parser = argparse.ArgumentParser(description="Find egne EmbedBot-backups ældre end 30 dage.")
    parser.add_argument("--directory", type=Path, default=Path(__file__).resolve().parents[1] / ".backups")
    parser.add_argument("--apply", action="store_true", help="Slet de fundne krypterede kopier permanent.")
    args = parser.parse_args()
    if not args.directory.is_dir():
        parser.error("Backupmappen findes ikke.")
    expired = expired_backups(args.directory, dt.datetime.now(dt.timezone.utc))
    for path in expired:
        print(("Sletter: " if args.apply else "Udløbet: ") + path.name)
        if args.apply:
            # Never delete recovery-key.bin, plaintext, other files or symlinks.
            if path.is_symlink() or not path.is_file():
                raise RuntimeError("Backupfilens type er ændret; sletning stoppet.")
            path.unlink()
    print(f"{len(expired)} udløbne kopier. " + ("Sletning gennemført." if args.apply else "Intet slettet; brug --apply efter gennemgang."))


if __name__ == "__main__":
    main()
