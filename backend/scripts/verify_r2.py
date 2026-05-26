#!/usr/bin/env python3
"""Verify Cloudflare R2 / S3 storage configuration."""
import os
import sys

from dotenv import load_dotenv

load_dotenv()


def main():
    required = ['S3_ENDPOINT_URL', 'S3_ACCESS_KEY_ID', 'S3_SECRET_ACCESS_KEY', 'S3_BUCKET_NAME']
    missing = [k for k in required if not os.getenv(k, '').strip()]
    if missing:
        print('MISSING env vars:', ', '.join(missing))
        print('\nAdd to backend/.env (from Cloudflare R2 dashboard):')
        print('  S3_ENDPOINT_URL=https://<account_id>.r2.cloudflarestorage.com')
        print('  S3_ACCESS_KEY_ID=...')
        print('  S3_SECRET_ACCESS_KEY=...')
        print('  S3_BUCKET_NAME=familyhub-files')
        print('  S3_REGION=auto')
        sys.exit(1)

    try:
        import boto3
        from botocore.client import Config
    except ImportError:
        print('Install boto3: pip install boto3')
        sys.exit(1)

    client = boto3.client(
        's3',
        endpoint_url=os.getenv('S3_ENDPOINT_URL'),
        aws_access_key_id=os.getenv('S3_ACCESS_KEY_ID'),
        aws_secret_access_key=os.getenv('S3_SECRET_ACCESS_KEY'),
        region_name=os.getenv('S3_REGION', 'auto'),
        config=Config(signature_version='s3v4'),
    )
    bucket = os.getenv('S3_BUCKET_NAME')
    try:
        client.head_bucket(Bucket=bucket)
        print(f'OK: bucket "{bucket}" is reachable')
        print('Restart backend and check GET /api/storage/status → configured: true')
    except Exception as exc:
        print(f'FAILED to reach bucket "{bucket}": {exc}')
        sys.exit(1)


if __name__ == '__main__':
    main()
