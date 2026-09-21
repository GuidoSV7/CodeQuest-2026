import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm'
import type { AuthProvider } from '../ports/user-repository.port'
import { UserOrmEntity } from './user.orm-entity'

@Entity({ name: 'auth_accounts' })
@Unique('auth_accounts_provider_account_uidx', ['provider', 'providerAccountId'])
export class AuthAccountOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string

  @ManyToOne(() => UserOrmEntity, (u) => u.authAccounts, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: UserOrmEntity

  @Column({ type: 'enum', enum: ['discord'], enumName: 'auth_provider' })
  provider!: AuthProvider

  @Column({ name: 'provider_account_id', type: 'varchar', length: 64 })
  providerAccountId!: string

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date
}
