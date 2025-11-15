import { BaseRepository } from './base.repository'

export interface UserEntity {
  id: number
  firstName: string
  lastName: string
  phoneNumber: string
  phoneNumber_verified_at: string | null
  division: string
  district: string
  upazilla: string
  bloodGroup: string
  donateBlood: string
  termsConditions: string
  status: string
  created_at: string
  updated_at: string
}

export class UserRepository extends BaseRepository<UserEntity> {
  constructor(db: any) {
    super(db, 'users')
  }

  /**
   * Find user by phone number
   */
  findByPhoneNumber(phoneNumber: string): UserEntity | null {
    try {
      const query = `SELECT * FROM users WHERE phoneNumber = ?`
      const user = this.db.prepare(query).get(phoneNumber) as UserEntity | undefined
      return user || null
    } catch (error) {
      console.error('[UserRepository] Error finding user by phone:', error)
      return null
    }
  }

  /**
   * Find user by ID
   */
  findById(id: number): UserEntity | undefined {
    try {
      const query = `SELECT * FROM users WHERE id = ?`
      const user = this.db.prepare(query).get(id) as UserEntity | undefined
      return user
    } catch (error) {
      console.error('[UserRepository] Error finding user by ID:', error)
      return undefined
    }
  }

  /**
   * Get all users
   */
  findAll(): UserEntity[] {
    try {
      const query = `SELECT * FROM users ORDER BY created_at DESC`
      const users = this.db.prepare(query).all() as UserEntity[]
      return users
    } catch (error) {
      console.error('[UserRepository] Error getting all users:', error)
      return []
    }
  }

  /**
   * Create or update user from API response
   */
  createOrUpdate(userData: Partial<UserEntity>): UserEntity | undefined {
    try {
      if (!userData.id) {
        console.error('[UserRepository] Cannot create/update user without ID')
        return undefined
      }

      const existingUser = this.findById(userData.id)

      if (existingUser) {
        // Update existing user
        const updateQuery = `
          UPDATE users SET
            firstName = ?,
            lastName = ?,
            phoneNumber = ?,
            phoneNumber_verified_at = ?,
            division = ?,
            district = ?,
            upazilla = ?,
            bloodGroup = ?,
            donateBlood = ?,
            termsConditions = ?,
            status = ?,
            updated_at = ?
          WHERE id = ?
        `
        this.db
          .prepare(updateQuery)
          .run(
            userData.firstName,
            userData.lastName,
            userData.phoneNumber,
            userData.phoneNumber_verified_at,
            userData.division,
            userData.district,
            userData.upazilla,
            userData.bloodGroup,
            userData.donateBlood,
            userData.termsConditions,
            userData.status,
            new Date().toISOString(),
            userData.id
          )
        return this.findById(userData.id)
      } else {
        // Create new user
        const insertQuery = `
          INSERT INTO users (
            id, firstName, lastName, phoneNumber, phoneNumber_verified_at,
            division, district, upazilla, bloodGroup, donateBlood,
            termsConditions, status, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `
        this.db
          .prepare(insertQuery)
          .run(
            userData.id,
            userData.firstName,
            userData.lastName,
            userData.phoneNumber,
            userData.phoneNumber_verified_at,
            userData.division,
            userData.district,
            userData.upazilla,
            userData.bloodGroup,
            userData.donateBlood,
            userData.termsConditions,
            userData.status,
            userData.created_at || new Date().toISOString(),
            userData.updated_at || new Date().toISOString()
          )
        return this.findById(userData.id)
      }
    } catch (error) {
      console.error('[UserRepository] Error creating or updating user:', error)
      return undefined
    }
  }

  /**
   * Create new user (abstract implementation)
   */
  create(data: Partial<UserEntity>): UserEntity {
    try {
      const insertQuery = `
        INSERT INTO users (
          firstName, lastName, phoneNumber, phoneNumber_verified_at,
          division, district, upazilla, bloodGroup, donateBlood,
          termsConditions, status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
      const result = this.db
        .prepare(insertQuery)
        .run(
          data.firstName || '',
          data.lastName || '',
          data.phoneNumber || '',
          data.phoneNumber_verified_at || null,
          data.division || '',
          data.district || '',
          data.upazilla || '',
          data.bloodGroup || '',
          data.donateBlood || '',
          data.termsConditions || '',
          data.status || 'active',
          new Date().toISOString(),
          new Date().toISOString()
        )
      const created = this.findById(Number(result.lastInsertRowid))
      if (!created) throw new Error('Failed to retrieve created user')
      return created
    } catch (error) {
      console.error('[UserRepository] Error creating user:', error)
      throw error
    }
  }

  /**
   * Update existing user (abstract implementation)
   */
  update(id: number, data: Partial<UserEntity>): UserEntity | undefined {
    try {
      const updateQuery = `
        UPDATE users SET
          firstName = COALESCE(?, firstName),
          lastName = COALESCE(?, lastName),
          phoneNumber = COALESCE(?, phoneNumber),
          phoneNumber_verified_at = COALESCE(?, phoneNumber_verified_at),
          division = COALESCE(?, division),
          district = COALESCE(?, district),
          upazilla = COALESCE(?, upazilla),
          bloodGroup = COALESCE(?, bloodGroup),
          donateBlood = COALESCE(?, donateBlood),
          termsConditions = COALESCE(?, termsConditions),
          status = COALESCE(?, status),
          updated_at = ?
        WHERE id = ?
      `
      this.db
        .prepare(updateQuery)
        .run(
          data.firstName,
          data.lastName,
          data.phoneNumber,
          data.phoneNumber_verified_at,
          data.division,
          data.district,
          data.upazilla,
          data.bloodGroup,
          data.donateBlood,
          data.termsConditions,
          data.status,
          new Date().toISOString(),
          id
        )
      return this.findById(id)
    } catch (error) {
      console.error('[UserRepository] Error updating user:', error)
      return undefined
    }
  }

  /**
   * Search users by name
   */
  searchByName(searchTerm: string): UserEntity[] {
    try {
      const query = `
        SELECT * FROM users
        WHERE firstName LIKE ? OR lastName LIKE ? OR phoneNumber LIKE ?
        ORDER BY created_at DESC
        LIMIT 20
      `
      const likePattern = `%${searchTerm}%`
      const users = this.db
        .prepare(query)
        .all(likePattern, likePattern, likePattern) as UserEntity[]
      return users
    } catch (error) {
      console.error('[UserRepository] Error searching users:', error)
      return []
    }
  }
}
