import dotenv from 'dotenv';
import { drive_v3, google } from 'googleapis';
import path from 'path';
import { Readable } from 'stream';
dotenv.config();

const GOOGLE_DRIVE_FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID;
const GOOGLE_DRIVE_KEY_FILE = process.env.GOOGLE_DRIVE_KEY_FILE;

if (!GOOGLE_DRIVE_FOLDER_ID || !GOOGLE_DRIVE_KEY_FILE) {
  throw new Error('GOOGLE_DRIVE_FOLDER_ID ou GOOGLE_DRIVE_KEY_FILE não estão definidos no .env');
}

/**
 * Cria um cliente de autenticação com o Google Drive.
 */
async function getGoogleAuth(): Promise<any> {
  const auth = new google.auth.GoogleAuth({
    keyFile: path.join(process.cwd(), GOOGLE_DRIVE_KEY_FILE!),
    scopes: ['https://www.googleapis.com/auth/drive.file'],
  });
  return auth.getClient();
}

/**
 * Faz upload de um arquivo binário para o Google Drive e retorna o link público.
 */
export async function uploadToGoogleDrive(fileBuffer: Buffer | Readable, fileName: string, folderId: string): Promise<string> {
  try {
    const authClient = await getGoogleAuth();
    const drive = google.drive({ version: 'v3', auth: authClient });

    const fileMetadata: drive_v3.Schema$File = {
      name: fileName,
      parents: [folderId || GOOGLE_DRIVE_FOLDER_ID!],
    };

    const media = {
      mimeType: 'application/octet-stream',
      body: fileBuffer instanceof Readable ? fileBuffer : Readable.from(fileBuffer),
    };

    const response = await drive.files.create({
      requestBody: fileMetadata,
      media,
      fields: 'id',
    });

    const fileId = response.data.id;
    if (!fileId) {
      throw new Error('Falha ao obter ID do arquivo após o upload');
    }

    await shareFilePublicly(drive, fileId);
    return generateFileLink(fileId);
  } catch (error) {
    console.error('Erro ao fazer upload no Google Drive:', error);
    throw error;
  }
}

/**
 * Gera um link público para visualização do arquivo.
 */
function generateFileLink(fileId: string): string {
  return `https://drive.google.com/file/d/${fileId}/view?usp=sharing`;
}

/**
 * Compartilha o arquivo publicamente com permissão de leitura.
 */
async function shareFilePublicly(drive: drive_v3.Drive, fileId: string): Promise<void> {
  await drive.permissions.create({
    fileId,
    requestBody: {
      type: 'anyone',
      role: 'reader',
    },
  });
}
