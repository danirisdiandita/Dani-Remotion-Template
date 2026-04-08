import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuid } from 'uuid';
import { ENV } from '@/config/constant';

const getEndpoint = () => {
    let endpoint = ENV.s3.endpoint;
    if (!endpoint) return undefined;

    // Ensure protocol is present
    if (!endpoint.startsWith('http://') && !endpoint.startsWith('https://')) {
        const protocol = ENV.s3.useSsl ? 'https://' : 'http://';
        endpoint = protocol + endpoint;
    }

    // If endpoint doesn't have a port and S3_PORT is provided, append it
    const protocolEndIndex = endpoint.indexOf('//') + 2;
    if (ENV.s3.port && !endpoint.includes(':', protocolEndIndex)) {
        return `${endpoint}:${ENV.s3.port}`;
    }
    return endpoint;
};

const s3Client = new S3Client({
    endpoint: getEndpoint(),
    region: ENV.s3.region || "us-east-1", // Providing a default fixes "Region is missing"
    credentials: {
        accessKeyId: ENV.s3.accessKey,
        secretAccessKey: ENV.s3.secretKey,
    },
    forcePathStyle: true, // Required for MinIO
});

export const UploadGetPublicUrl = async (file: File): Promise<string> => {
    try {
        const fileId = uuid();
        const filename = `${fileId}-${file.name.replace(/\s+/g, '')}`;
        const buffer = Buffer.from(await file.arrayBuffer());

        const command = new PutObjectCommand({
            Bucket: ENV.s3.bucket,
            Key: filename,
            Body: buffer,
            ContentType: file.type,
        });

        await s3Client.send(command);

        // Construct public URL. Note: this assumes the bucket is public or reachable via endpoint/bucket/key
        const protocol = ENV.s3.useSsl ? 'https' : 'http';
        return `${protocol}://${ENV.s3.endpoint.replace(/^https?:\/\//, '')}/${ENV.s3.bucket}/${filename}`;
    } catch (error) {
        console.error(error);
        throw new Error('Failed to upload file');
    }
};

export const getPresignedUploadUrl = async (originalFilename: string) => {
    try {
        const fileId = uuid();
        const filename = `${fileId}-${originalFilename.replace(/\s+/g, '')}`;
        const bucketName = ENV.s3.bucket;

        const command = new PutObjectCommand({
            Bucket: bucketName,
            Key: filename,
        });

        const presignedUrl = await getSignedUrl(s3Client, command, { expiresIn: 900 });

        return {
            presignedUrl,
            filename
        };
    } catch (error) {
        console.error(error);
        throw new Error('Failed to generate presigned URL');
    }
};

export const getPresignedUploadUrlByKey = async (key: string, contentType?: string) => {
    try {
        const bucketName = ENV.s3.bucket;
        const command = new PutObjectCommand({
            Bucket: bucketName,
            Key: key,
            ContentType: contentType,
        });

        const presignedUrl = await getSignedUrl(s3Client, command, { expiresIn: 900 });

        return {
            presignedUrl,
            key
        };
    } catch (error) {
        console.error(error);
        throw new Error('Failed to generate presigned upload URL');
    }
};

export const getPresignedDownloadUrl = async (filename: string, contentType?: string, contentDisposition?: string) => {
    try {
        const bucketName = ENV.s3.bucket;
        const command = new GetObjectCommand({
            Bucket: bucketName,
            Key: filename,
            ResponseContentType: contentType,
            ResponseContentDisposition: contentDisposition,
        });

        const presignedUrl = await getSignedUrl(s3Client, command, { expiresIn: 900 });

        return presignedUrl;
    } catch (error) {
        console.error(error);
        throw new Error('Failed to generate presigned download URL');
    }
};

export const deleteFromS3 = async (filename: string) => {
    try {
        const bucketName = ENV.s3.bucket;
        const command = new DeleteObjectCommand({
            Bucket: bucketName,
            Key: filename,
        });

        await s3Client.send(command);
    } catch (error) {
        console.error(error);
        throw new Error('Failed to delete file from S3');
    }
};

export const downloadFromS3 = async (s3Key: string, localPath: string) => {
    const fs = await import('node:fs');
    const { pipeline } = await import('node:stream/promises');

    const bucketName = ENV.s3.bucket;
    const command = new GetObjectCommand({
        Bucket: bucketName,
        Key: s3Key,
    });

    const response = await s3Client.send(command);
    
    if (!response.Body) {
        throw new Error('Empty response body');
    }

    const outputStream = fs.createWriteStream(localPath);
    // Cast to NodeJS.ReadableStream as AWS SDK's ReadableStream is slightly different
    await pipeline(response.Body as NodeJS.ReadableStream, outputStream);
    
    return localPath;
};

export const downloadToBuffer = async (s3Key: string): Promise<Buffer> => {
    const bucketName = ENV.s3.bucket;
    const command = new GetObjectCommand({
        Bucket: bucketName,
        Key: s3Key,
    });

    const response = await s3Client.send(command);
    
    if (!response.Body) {
        throw new Error('Empty response body');
    }

    // transformToByteArray is available on the stream returned by the SDK in many environments
    // or we can use the helper if it's not.
    const byteArray = await response.Body.transformToByteArray();
    return Buffer.from(byteArray);
};

/**
 * Uploads a local file to S3.
 */
export const uploadFileToS3 = async (localPath: string, s3Key: string, contentType: string) => {
    const fs = await import('node:fs');
    const fileStream = fs.createReadStream(localPath);
    const command = new PutObjectCommand({
        Bucket: ENV.s3.bucket,
        Key: s3Key,
        Body: fileStream,
        ContentType: contentType,
    });
    await s3Client.send(command);
    return s3Key;
};

export const deleteMultipleFromS3 = async (keys: string[]) => {
    if (!keys || keys.length === 0) return;
    try {
        const bucketName = ENV.s3.bucket;

        // Some S3-compatible providers (like certain MinIO configurations or Cloudflare R2)
        // do not implement the DeleteObjects (multi-delete) API, which uses POST /?delete.
        // We fallback to deleting objects individually to ensure compatibility.
        await Promise.all(
            keys.map(async (key) => {
                const command = new DeleteObjectCommand({
                    Bucket: bucketName,
                    Key: key,
                });
                return s3Client.send(command);
            })
        );
    } catch (error) {
        console.error("Bulk S3 deletion error:", error);
        throw new Error('Failed to delete multiple files from S3');
    }
};

export const uploadFileToS3Presigned = async (localPath: string, s3Key: string, contentType: string) => {
    const { presignedUrl } = await getPresignedUploadUrlByKey(s3Key, contentType);
    const fs = await import('node:fs');
    const buffer = fs.readFileSync(localPath);

    const res = await fetch(presignedUrl, {
        method: "PUT",
        body: buffer,
        headers: {
            "Content-Type": contentType
        }
    });

    if (!res.ok) {
        const errorText = await res.text();
        console.error("Presigned upload error:", errorText);
        throw new Error(`Failed to upload file via presigned URL: ${res.status} ${res.statusText}`);
    }

    return s3Key;
};