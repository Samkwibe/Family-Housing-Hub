"""S3 / Cloudflare R2 presigned upload and download URLs."""
import os
import re
import uuid

import boto3
from botocore.client import Config

S3_ENDPOINT_URL = os.getenv('S3_ENDPOINT_URL')  # R2: https://<account>.r2.cloudflarestorage.com
S3_ACCESS_KEY_ID = os.getenv('S3_ACCESS_KEY_ID') or os.getenv('AWS_ACCESS_KEY_ID')
S3_SECRET_ACCESS_KEY = os.getenv('S3_SECRET_ACCESS_KEY') or os.getenv('AWS_SECRET_ACCESS_KEY')
S3_BUCKET_NAME = os.getenv('S3_BUCKET_NAME')
S3_REGION = os.getenv('S3_REGION', 'auto')
S3_PUBLIC_BASE_URL = os.getenv('S3_PUBLIC_BASE_URL', '').rstrip('/')

PRESIGNED_TTL = int(os.getenv('S3_PRESIGNED_TTL_SECONDS', '3600'))

ALLOWED_FOLDERS = frozenset({'documents', 'checklist'})
ALLOWED_CONTENT_TYPES = frozenset({
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/heic',
    'image/heif',
})


def storage_configured() -> bool:
    return bool(S3_BUCKET_NAME and S3_ACCESS_KEY_ID and S3_SECRET_ACCESS_KEY)


def _client():
    if not storage_configured():
        raise RuntimeError('File storage is not configured. Set S3_BUCKET_NAME and credentials in backend/.env')
    kwargs = {
        'service_name': 's3',
        'aws_access_key_id': S3_ACCESS_KEY_ID,
        'aws_secret_access_key': S3_SECRET_ACCESS_KEY,
        'region_name': S3_REGION,
        'config': Config(signature_version='s3v4'),
    }
    if S3_ENDPOINT_URL:
        kwargs['endpoint_url'] = S3_ENDPOINT_URL
    return boto3.client(**kwargs)


def _safe_filename(name: str) -> str:
    base = (name or 'file').strip().replace('\\', '/').split('/')[-1]
    base = re.sub(r'[^a-zA-Z0-9._-]+', '-', base).strip('-') or 'file'
    return base[:120]


def build_file_key(household_id: str, folder: str, filename: str) -> str:
    if folder not in ALLOWED_FOLDERS:
        raise ValueError(f'Invalid folder. Use one of: {", ".join(sorted(ALLOWED_FOLDERS))}')
    return f'households/{household_id}/{folder}/{uuid.uuid4().hex}-{_safe_filename(filename)}'


def validate_content_type(content_type: str) -> str:
    ct = (content_type or 'application/octet-stream').split(';')[0].strip().lower()
    if ct not in ALLOWED_CONTENT_TYPES:
        raise ValueError(f'Unsupported file type: {ct}')
    return ct


def create_presigned_upload(file_key: str, content_type: str) -> str:
    client = _client()
    return client.generate_presigned_url(
        'put_object',
        Params={
            'Bucket': S3_BUCKET_NAME,
            'Key': file_key,
            'ContentType': content_type,
        },
        ExpiresIn=PRESIGNED_TTL,
        HttpMethod='PUT',
    )


def create_presigned_download(file_key: str, *, filename: str | None = None) -> str:
    if not file_key:
        raise ValueError('fileKey is required')
    client = _client()
    params = {'Bucket': S3_BUCKET_NAME, 'Key': file_key}
    if filename:
        params['ResponseContentDisposition'] = f'inline; filename="{_safe_filename(filename)}"'
    return client.generate_presigned_url(
        'get_object',
        Params=params,
        ExpiresIn=PRESIGNED_TTL,
    )


def user_can_access_file_key(file_key: str, household_id: str) -> bool:
    prefix = f'households/{household_id}/'
    return bool(file_key and file_key.startswith(prefix))
