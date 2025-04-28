import { S3Client, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import dotenv from 'dotenv';
dotenv.config(); // Carrega as variáveis do .env

const s3Client = new S3Client({ region: process.env.AWS_REGION });

// Função para verificar se o arquivo é de vídeo
export function isVideoFile(fileName) {
  const videoExtensions = ['.mp4', '.mkv', '.avi', '.mov', '.flv', '.webm'];
  const fileExtension = fileName.slice(fileName.lastIndexOf('.')).toLowerCase();
  return videoExtensions.includes(fileExtension);
}

// Função para baixar o arquivo do S3
export async function downloadFromS3(bucketName, objectKey) {
  const command = new GetObjectCommand({ Bucket: bucketName, Key: objectKey });
  const s3Object = await s3Client.send(command);
  return s3Object.Body; // Buffer do arquivo
}

export async function deleteFromS3(bucketName, objectKey) {
  const deleteParams = { Bucket: bucketName, Key: objectKey };
  try {
    await s3Client.send(new DeleteObjectCommand(deleteParams));
  } catch (error) {
    console.error('Erro ao deletar arquivo do S3:', error);
  }
}