import * as sql from 'mssql'

const config: sql.config = {
  server: process.env.DB_SERVER ?? '127.0.0.1',
  port: parseInt(process.env.DB_PORT ?? '1434'),
  database: process.env.DB_NAME ?? 'LangTeach',
  user: process.env.DB_USER ?? 'sa',
  password: process.env.DB_PASSWORD ?? 'LangTeach_Dev1!',
  options: { trustServerCertificate: true },
}

export function getTestAuth0UserId(): string {
  const id = process.env.E2E_TEST_AUTH0_USER_ID
  if (!id) throw new Error('E2E_TEST_AUTH0_USER_ID env var is required')
  return id
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

export async function deleteTeacherByEmail(email: string): Promise<void> {
  const pool = await new sql.ConnectionPool(config).connect()
  try {
    await pool
      .request()
      .input('email', sql.NVarChar, email)
      .query('DELETE FROM Teachers WHERE Email = @email')
  } finally {
    await pool.close()
  }
}

export async function updateTeacherAuth0Id(email: string, newAuth0UserId: string): Promise<void> {
  const pool = await new sql.ConnectionPool(config).connect()
  try {
    const result = await pool
      .request()
      .input('email', sql.NVarChar, email)
      .input('newAuth0UserId', sql.NVarChar, newAuth0UserId)
      .query('UPDATE Teachers SET Auth0UserId = @newAuth0UserId WHERE Email = @email')
    if (result.rowsAffected[0] === 0) {
      throw new Error(`updateTeacherAuth0Id: no teacher found with Email "${email}"`)
    }
  } finally {
    await pool.close()
  }
}

export async function approveTeacherByAuth0Id(auth0UserId: string): Promise<void> {
  if (!auth0UserId) throw new Error('approveTeacherByAuth0Id: auth0UserId is required')
  const pool = await new sql.ConnectionPool(config).connect()
  try {
    const result = await pool
      .request()
      .input('auth0UserId', sql.NVarChar, auth0UserId)
      .query('UPDATE Teachers SET IsApproved = 1 WHERE Auth0UserId = @auth0UserId')
    if (result.rowsAffected[0] === 0) {
      throw new Error(`approveTeacherByAuth0Id: no teacher found with Auth0UserId "${auth0UserId}"`)
    }
  } finally {
    await pool.close()
  }
}
