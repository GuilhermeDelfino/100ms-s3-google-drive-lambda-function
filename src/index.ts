import { S3Event, S3EventRecord } from "aws-lambda";
import dotenv from "dotenv";
import { processReuniao } from "./db/dbUtils";
import { deleteFromS3, downloadFromS3, isVideoFile } from "./s3/s3Utils";
dotenv.config();

export const handler = async (event: S3Event) => {
  try {
    const record = extractFirstRecord(event);
    const { bucketName, objectKey, publicLink } = extractS3Info(record);

    if (!objectKey) {
      return buildResponse(400, "Chave do objeto S3 ausente.");
    }

    if (!isVideoFile(objectKey)) {
      await deleteFromS3(bucketName, objectKey);
      return buildResponse(200, "Arquivo não é vídeo, deletado com sucesso.");
    }

    const recordId = extractRecordIdFromKey(objectKey);
    const fileBuffer = await downloadFromS3(bucketName, objectKey);

    if (!fileBuffer) {
      return buildResponse(500, "Arquivo vazio ou falha no download do S3.");
    }

    await processReuniao(recordId, fileBuffer, publicLink);
    // await deleteFromS3(bucketName, objectKey);

    return buildResponse(200, "Upload e processamento concluídos com sucesso.");
  } catch (error: any) {
    console.error("Erro ao processar o arquivo:", error);
    return buildErrorResponse(error);
  }
};

/**
 * Extrai o primeiro registro de evento S3 e valida.
 */
function extractFirstRecord(event: S3Event): S3EventRecord {
  if (!event.Records || event.Records.length === 0) {
    throw new Error("Evento S3 malformado: nenhum registro encontrado.");
  }
  return event.Records[0];
}

/**
 * Extrai e valida o nome do bucket e a chave do objeto.
 */
function extractS3Info(record: S3EventRecord): {
  bucketName: string;
  objectKey: string;
  publicLink: string;
} {
  const bucketName = record.s3?.bucket?.name;
  const objectKey = record.s3?.object?.key;

  if (!bucketName || !objectKey) {
    throw new Error("Informações do bucket ou key ausentes no evento S3.");
  }

  return {
    bucketName,
    objectKey,
    publicLink: `https://${bucketName}.s3.${
      process.env.AWS_REGION
    }.amazonaws.com/${encodeURIComponent(objectKey)}`,
  };
}

/**
 * Extrai o ID do registro da chave do arquivo.
 */
function extractRecordIdFromKey(objectKey: string): string {
  const match = objectKey.match(/Rec-(\w+)/);
  if (!match || match.length < 2) {
    throw new Error(`Formato inválido da chave do objeto: ${objectKey}`);
  }
  return match[1];
}

/**
 * Cria uma resposta HTTP padrão.
 */
function buildResponse(statusCode: number, message: string) {
  return {
    statusCode,
    body: JSON.stringify({ message }),
  };
}

/**
 * Cria uma resposta de erro estruturada.
 */
function buildErrorResponse(error: Error) {
  return {
    statusCode: 500,
    body: JSON.stringify({
      message: "Erro interno no processamento.",
      error: error.message,
      stack: error.stack,
    }),
  };
}
