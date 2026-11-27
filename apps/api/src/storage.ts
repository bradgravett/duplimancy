import { DeleteObjectsCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { config } from './config.ts';

const s = config.spaces;
const client = s
  ? new S3Client({
      endpoint: s.endpoint,
      region: s.region,
      credentials: { accessKeyId: s.key, secretAccessKey: s.secret },
    })
  : null;

export const uploadsEnabled = client !== null;

/** Presigned PUT straight from the browser to Spaces. Valid for 5 minutes. */
export async function presignPut(key: string, contentType: string, bytes: number) {
  if (!client || !s) throw new Error('uploads disabled');
  const cmd = new PutObjectCommand({
    Bucket: s.bucket,
    Key: key,
    ContentType: contentType,
    ContentLength: bytes,
    ACL: 'public-read',
    CacheControl: 'public, max-age=31536000, immutable',
  });
  const url = await getSignedUrl(client, cmd, {
    expiresIn: 300,
    signableHeaders: new Set(['content-type', 'content-length', 'x-amz-acl']),
  });
  return {
    url,
    headers: { 'Content-Type': contentType, 'x-amz-acl': 'public-read', 'Cache-Control': 'public, max-age=31536000, immutable' },
    publicUrl: `${s.publicUrl}/${key}`,
  };
}

export async function deleteObjects(keys: string[]) {
  if (!client || !s || keys.length === 0) return;
  for (let i = 0; i < keys.length; i += 1000) {
    await client.send(
      new DeleteObjectsCommand({
        Bucket: s.bucket,
        Delete: { Objects: keys.slice(i, i + 1000).map((Key) => ({ Key })), Quiet: true },
      }),
    );
  }
}
