import boto3

from app.config import settings


def get_s3_client():
    return boto3.client(
        "s3",
        endpoint_url=settings.storage_endpoint_url,
        aws_access_key_id=settings.storage_access_key_id,
        aws_secret_access_key=settings.storage_secret_access_key,
        region_name=settings.storage_region,
    )


def upload_file(key: str, content: bytes, content_type: str) -> None:
    """Uploads to the configured S3-compatible bucket (Supabase Storage).

    Deliberately a thin, mockable wrapper -- tests patch this function
    directly instead of hitting the real bucket (network call, burns the
    free-tier quota, and makes tests flaky/slow for no benefit).
    """
    client = get_s3_client()
    client.put_object(Bucket=settings.storage_bucket, Key=key, Body=content, ContentType=content_type)
