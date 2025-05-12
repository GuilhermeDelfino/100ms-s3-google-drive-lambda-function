import { DeleteObjectCommand, GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import dotenv from 'dotenv';
import { Readable } from 'stream';
dotenv.config();
const region = process.env.AWS_REGION;
if (!region) {
  throw new Error('AWS_REGION não definida no .env');
}

const s3Client = new S3Client({ region });

const VIDEO_EXTENSIONS = ['.mp4', '.mkv', '.avi', '.mov', '.flv', '.webm'];

/**
 * Verifica se o arquivo tem uma extensão de vídeo suportada.
 */
export function isVideoFile(fileName: string): boolean {
  const ext = fileName.slice(fileName.lastIndexOf('.')).toLowerCase();
  return VIDEO_EXTENSIONS.includes(ext);
}

/**
 * Baixa um objeto do S3 como Readable.
 */

export async function downloadFromS3(bucketName: string, objectKey: string): Promise<Readable | null> {
  try {
    const command = new GetObjectCommand({ Bucket: bucketName, Key: objectKey });
    const { Body } = await s3Client.send(command);

    if (!Body) {
      console.error('Body não está presente na resposta do S3');
      return null;
    }

    // Verifica se é Web ReadableStream (em runtime)
    if (typeof (Body as any).getReader === 'function') {
      const reader = (Body as any).getReader();
      return new Readable({
        async read() {
          const { done, value } = await reader.read();
          if (done) {
            this.push(null);
          } else {
            this.push(Buffer.from(value));
          }
        },
      });
    }

    // Se já for um Node.js Readable
    if (Body instanceof Readable) {
      return Body;
    }

    console.error('Formato do Body inesperado.');
    return null;
  } catch (error) {
    console.error('Erro ao baixar arquivo do S3:', error);
    return null;
  }
}

/**
 * Deleta um objeto do S3.
 */
export async function deleteFromS3(bucketName: string, objectKey: string): Promise<void> {
  try {
    const command = new DeleteObjectCommand({ Bucket: bucketName, Key: objectKey });
    await s3Client.send(command);
  } catch (error) {
    console.error('Erro ao deletar arquivo do S3:', error);
  }
}

/**
 * Converte uma stream legível para um buffer.
 */
function streamToBuffer(stream: Readable): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Uint8Array[] = [];
    stream.on('data', (chunk) => chunks.push(chunk));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', reject);
  });
}
