import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../users/user.entity';
import { SchedulingType } from './scheduling-type.enum';

@Entity({ name: 'doctor_profiles' })
export class DoctorProfile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  specialization: string;

  @Column()
  qualification: string;

  @Column()
  experienceYears: number;

  @Column()
  consultationFee: number;

  @Column({
    type: 'enum',
    enum: SchedulingType,
    default: SchedulingType.STREAM,
  })
  schedulingType: SchedulingType;

  @Column({ default: 1 })
  maxPatientCapacity: number;

  @Column({ type: 'text', nullable: true })
  bio?: string;

  @Column()
  clinicAddress: string;

  @OneToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn()
  user: User;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
