import * as sql from 'mssql'

const config: sql.config = {
  server: process.env.DB_SERVER ?? '127.0.0.1',
  port: parseInt(process.env.DB_PORT ?? '1434'),
  database: process.env.DB_NAME ?? 'LangTeach',
  user: process.env.DB_USER ?? 'sa',
  password: process.env.DB_PASSWORD ?? 'LangTeach_Dev1!',
  options: { trustServerCertificate: true },
}

export async function deleteTeacherByAuth0Id(auth0UserId: string): Promise<void> {
  const pool = await new sql.ConnectionPool(config).connect()
  try {
    await pool
      .request()
      .input('auth0UserId', sql.NVarChar, auth0UserId)
      .query('DELETE FROM Teachers WHERE Auth0UserId = @auth0UserId')
  } finally {
    await pool.close()
  }
}
