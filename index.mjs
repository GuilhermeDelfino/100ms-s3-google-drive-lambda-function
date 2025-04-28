import { deleteFromS3, isVideoFile, downloadFromS3 } from './s3/s3Utils.js';
import { uploadToGoogleDrive } from './googleDrive/googleDriveUtils.js';
import { processReuniao } from './db/dbUtils.js';

export async function handler(event) {
  try {
    const { bucket: { name: bucketName }, object: { key: objectKey } } = event.Records[0].s3;

    if (!isVideoFile(objectKey)) {
      await deleteFromS3(bucketName, objectKey);
      return {
        statusCode: 200,
        body: JSON.stringify({ message: 'Arquivo não é vídeo, deletado com sucesso.' }),
      };
    }

    const recordId = extractRecordIdFromKey(objectKey);
    const fileBuffer = await downloadFromS3(bucketName, objectKey);

    if (!fileBuffer) {
      throw new Error('Falha ao baixar o arquivo do S3');
    }

    const fileLink = await uploadToGoogleDrive(fileBuffer, objectKey);

    await processReuniao(recordId, fileLink);

    await deleteFromS3(bucketName, objectKey);

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Upload concluído com sucesso!', fileLink }),
    };
  } catch (error) {
    console.error('Erro ao processar o arquivo:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: 'Erro interno',
        error: error.message,
        details: error.stack,  // Adicionando o stack trace para depuração
      }),
    };
  }
}

function extractRecordIdFromKey(objectKey) {
  if (!objectKey || !objectKey.includes("Rec")) {
    throw new Error('Formato de key inválido');
  }
  return objectKey.split("Rec")[1]?.split('-')[0];
}