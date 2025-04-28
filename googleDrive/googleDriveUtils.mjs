import { google } from 'googleapis';
import path from 'path';
import dotenv from 'dotenv';
dotenv.config(); // Carrega as variáveis do .env

// ID da pasta no Google Drive
const GOOGLE_DRIVE_FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID;

async function getGoogleAuth() {
  const auth = new google.auth.GoogleAuth({
    keyFile: path.join(process.cwd(), process.env.GOOGLE_DRIVE_KEY_FILE),
    scopes: ['https://www.googleapis.com/auth/drive.file'],
  });
  return auth.getClient();
}

export async function uploadToGoogleDrive(fileBuffer, fileName) {
  const authClient = await getGoogleAuth();
  const drive = google.drive({ version: 'v3', auth: authClient });

  const fileMetadata = {
    name: fileName,
    parents: [GOOGLE_DRIVE_FOLDER_ID],
  };

  const media = {
    mimeType: 'application/octet-stream',
    body: fileBuffer,
  };

  const response = await drive.files.create({
    requestBody: fileMetadata,
    media: media,
    fields: 'id',
  });

  await shareFilePublicly(drive, response.data.id);

  return generateFileLink(response.data.id);
}

// Função para gerar o link público do arquivo
function generateFileLink(fileId) {
  return `https://drive.google.com/file/d/${fileId}/view?usp=sharing`;
}

// Função para compartilhar o arquivo publicamente
async function shareFilePublicly(drive, fileId) {
  await drive.permissions.create({
    fileId,
    requestBody: {
      type: 'anyone',
      role: 'reader',
    },
  });
}

export { uploadToGoogleDrive };