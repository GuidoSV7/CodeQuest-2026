import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm'
import { AuthAccountOrmEntity } from './auth-account.orm-entity'

@Entity({ name: 'users' })
export class UserOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Column({ name: 'display_name', type: 'varchar', length: 128 })
  displayName!: string

  @Column({ name: 'avatar_url', type: 'text', nullable: true })
  avatarUrl!: string | null

  @Index('users_email_uidx', { unique: true, where: '"email" IS NOT NULL' })
  @Column({ type: 'varchar', length: 320, nullable: true })
  email!: string | null

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date

  @OneToMany(() => AuthAccountOrmEntity, (a) => a.user)
  authAccounts!: AuthAccountOrmEntity[]
}
