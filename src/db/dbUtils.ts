import mysql, { Connection } from 'mysql2/promise';

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

/**
 * Atualiza a URL de gravação de uma reunião no banco de dados com base no ID externo.
 * @param recordId - O ID externo da reunião (ex: 'Rec-1234')
 * @param link - A URL da gravação a ser associada
 */
export async function processReuniao(recordId: string, link: Buffer<ArrayBufferLike>): Promise<void> {
  const connection = await createDbConnection();
  try {
    const [rows] = await connection.execute('SELECT * FROM reuniao WHERE reuniao_external_id = ? LIMIT 1', [recordId]);

    const reunioes = rows as any[];

    if (!reunioes.length) {
      console.warn(`Nenhuma reunião encontrada para o ID: ${recordId}`);
      throw new Error('Reunião não encontrada');
    }

    const [updateResult] = await connection.execute(
      'UPDATE reuniao SET url_gravacao = ? WHERE reuniao_external_id = ?',
      [link, recordId]
    );

    const { affectedRows } = updateResult as mysql.ResultSetHeader;

    if (affectedRows === 0) {
      throw new Error('A reunião não pôde ser atualizada');
    }

    console.log(`✅ Reunião atualizada com sucesso: ${affectedRows} linha(s) afetada(s)`);
  } catch (error) {
    console.error('❌ Erro ao processar a reunião:', error);
    throw error;
  } finally {
    await connection.end();
  }
}
