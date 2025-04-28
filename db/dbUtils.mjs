import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config(); // Carrega as variáveis do .env

// Função para criar a conexão com o banco de dados
async function createDbConnection() {
  return mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: 3308, // Porta 3308
  });
}

export async function processReuniao(recordId, link) {
  const connection = await createDbConnection();
  try {
    const [rows] = await connection.execute(
      'SELECT * FROM reuniao r WHERE r.reuniao_external_id = ? LIMIT 1',
      [recordId]
    );

    if (rows.length === 0) {
      console.log(`Nenhuma reunião encontrada para o ID: ${recordId}`);
      throw new Error('Reunião não encontrada');
    }

    const response = await connection.execute(
      'UPDATE reuniao r SET url_gravacao = ? WHERE r.reuniao_external_id = ?',
      [link, recordId]
    );

    console.log(`✅ Reunião atualizada com sucesso: ${response.affectedRows} linha(s) afetada(s)`);
  } catch (error) {
    console.error('Erro ao processar a reunião:', error);
    throw new Error('Erro ao acessar ou atualizar a reunião');
  } finally {
    await connection.end();
  }
}
