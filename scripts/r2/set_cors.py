#!/usr/bin/env python3
"""Set the CORS rules on the R2 bucket used by the library.

Why this is needed
------------------
The admin panel signs uploads in the browser, so the bucket must answer the
browser preflight (`OPTIONS`) for `PUT` and `DELETE`. Without that rule every
upload fails with:

    403 Unauthorized - CORS not configured for this bucket

Rules applied
-------------
1. Public reads: `GET`, `HEAD` from any origin. The app fetches
   `catalog/*.json` and opens PDFs/covers directly from the public r2.dev URL.
2. Admin writes: `PUT`, `POST`, `DELETE` from the admin panel origins only.

Usage
-----
    python scripts/r2/set_cors.py            # apply the rules below
    python scripts/r2/set_cors.py --show     # print the current rules

Credentials come from `scripts/r2/.env`
(R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET).

Add the deployed admin origin to ADMIN_ORIGINS if the panel is ever hosted.
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

import boto3

ENV_FILE = Path(__file__).resolve().parent / ".env"

ADMIN_ORIGINS = [
    "http://127.0.0.1:3001",
    "http://localhost:3001",
    "https://admin.gostudy.app",
]

CORS_RULES = [
    {
        "AllowedOrigins": ["*"],
        "AllowedMethods": ["GET", "HEAD"],
        "AllowedHeaders": ["*"],
        "ExposeHeaders": ["ETag", "Content-Length", "Content-Range", "Accept-Ranges"],
        "MaxAgeSeconds": 86400,
    },
    {
        "AllowedOrigins": ADMIN_ORIGINS,
        "AllowedMethods": ["PUT", "POST", "DELETE"],
        "AllowedHeaders": ["*"],
        "ExposeHeaders": ["ETag"],
        "MaxAgeSeconds": 3600,
    },
]


def load_env() -> dict[str, str]:
    text = ENV_FILE.read_text(encoding="utf-8-sig")
    pairs = re.findall(r"^([A-Z0-9_]+)=(.*)$", text, re.M)
    return {key: value.strip().strip('"').strip("'") for key, value in pairs}


def client_for(env: dict[str, str]):
    boto3.setup_default_session(
        aws_access_key_id=env["R2_ACCESS_KEY_ID"],
        aws_secret_access_key=env["R2_SECRET_ACCESS_KEY"],
    )
    return boto3.client(
        "s3",
        endpoint_url=f"https://{env['R2_ACCOUNT_ID']}.r2.cloudflarestorage.com",
        region_name="auto",
    )


def main() -> int:
    env = load_env()
    bucket = env.get("R2_BUCKET", "gostudy")
    s3 = client_for(env)

    if "--show" in sys.argv:
        try:
            print(json.dumps(s3.get_bucket_cors(Bucket=bucket)["CORSRules"], indent=2))
        except Exception as exc:  # noqa: BLE001 - reported to the operator
            print(f"could not read CORS rules: {type(exc).__name__}: {exc}")
            return 1
        return 0

    s3.put_bucket_cors(Bucket=bucket, CORSConfiguration={"CORSRules": CORS_RULES})
    print(f"CORS updated on bucket '{bucket}':")
    print(json.dumps(s3.get_bucket_cors(Bucket=bucket)["CORSRules"], indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
