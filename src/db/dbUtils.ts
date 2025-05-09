import mysql, { Connection, RowDataPacket } from 'mysql2/promise';
import { uploadToGoogleDrive } from '../googleDrive/googleDriveUtils';


// Verificações das variáveis de ambiente
const DB_HOST = process.env.DB_HOST;
const DB_USER = process.env.DB_USER;
const DB_PASSWORD = process.env.DB_PASSWORD;
const DB_NAME = process.env.DB_NAME;

if (!DB_HOST || !DB_USER || !DB_PASSWORD || !DB_NAME) {
  throw new Error('Variáveis de ambiente do banco de dados estão ausentes');
}

/**
 * Cria uma conexão com o banco de dados MySQL.
 */
async function createDbConnection(): Promise<Connection> {
  return mysql.createConnection({
    host: DB_HOST,
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME,
    port: 3308, // Porta definida
  });
}
export type Reuniao = {
  id: number;
  cliente_id: number;
  medico_id: number;
  data_inicio: string;
  operadora_id: number;
  folder?: string;
}
/**
 * Atualiza a URL de gravação de uma reunião no banco de dados com base no ID externo.
 * @param recordId - O ID externo da reunião (ex: 'Rec-1234')
 * @param link - A URL da gravação a ser associada
 */
// Processa a reunião e envia o arquivo ao Google Drive
export async function processReuniao(recordId: string, fileBuffer: Buffer): Promise<string> {

  const connection = await createDbConnection();

  try {
    console.log('Iniciando processamento da reunião id ' + recordId + '...');

    const [rows] = await connection.execute(
      `SELECT r.id, r.cliente_id, r.medico_id, r.data_inicio, r.operadora_id,
              o.folder as folder
       FROM telemed.reuniao r
       JOIN operadora o ON o.id = r.operadora_id
       WHERE r.reuniao_external_id = ?
       LIMIT 1`,
      [recordId]
    ) as RowDataPacket[];

    const reunioes: Reuniao[] = rows.map((row: Reuniao) => ({
      id: row.id,
      cliente_id: row.cliente_id,
      medico_id: row.medico_id,
      data_inicio: row.data_inicio,
      operadora_id: row.operadora_id,
      folder: row.folder,
    }));

    if (rows.length === 0) {
      console.log(`Nenhuma reunião encontrada para o ID: ${recordId}`);
      throw new Error('Reunião não encontrada');
    }

    const reuniao = rows[0];
    console.log({ reuniao });

    const dataInicio = new Date(reuniao.data_inicio);
    const timestamp = Date.now();

    const dataFormatada = dataInicio
      .toLocaleString('pt-BR', { timeZone: 'UTC' })
      .replace(/[^\d]/g, '')
      .slice(0, 12);

    const filename = `r_${reuniao.id}_c_${reuniao.cliente_id}_m_${reuniao.medico_id}_${dataFormatada}_${timestamp}.mp4`;
    const folder = reuniao.folder || process.env.GOOGLE_DRIVE_FOLDER_ID;

    const link = await uploadToGoogleDrive(fileBuffer, filename, folder);

    const [result] = await connection.execute(
      'UPDATE reuniao r SET url_gravacao = ? WHERE r.reuniao_external_id = ?',
      [link, recordId]
    );

    // mysql2 retorna um tipo RowDataPacket[], o segundo retorno é sempre um resultado
    const affectedRows = (result as mysql.ResultSetHeader).affectedRows;
    console.log(`✅ Reunião atualizada com sucesso: ${affectedRows} linha(s) afetada(s)`);

    return link;
  } catch (error) {
    console.error('Erro ao processar a reunião:', error);
    throw new Error('Erro ao acessar ou atualizar a reunião');
  } finally {
    await connection.end();
  }
}
