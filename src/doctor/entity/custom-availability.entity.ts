import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { DoctorProfile } from '../doctor-profile.entity';

@Entity({ name: 'custom_availabilities' })
@Check('CHK_custom_availabilities_time_order', '"startTime" < "endTime"')
@Unique('UQ_custom_availabilities_doctor_date_time', [
  'doctor',
  'date',
  'startTime',
  'endTime',
])
export class CustomAvailability {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => DoctorProfile, { nullable: false, onDelete: 'CASCADE' })
  doctor: DoctorProfile;

  @Column({ type: 'date' })
  date: string;

  @Column({ type: 'time' })
  startTime: string;

  @Column({ type: 'time' })
  endTime: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
