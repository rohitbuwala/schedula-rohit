import {
  Column,
  CreateDateColumn,
  Entity,
  Check,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { DoctorProfile } from '../doctor-profile.entity';

@Entity({ name: 'recurring_availabilities' })
@Check(
  'CHK_recurring_availabilities_day_of_week',
  '"dayOfWeek" >= 0 AND "dayOfWeek" <= 6',
)
@Check('CHK_recurring_availabilities_time_order', '"startTime" < "endTime"')
@Unique('UQ_recurring_availabilities_doctor_day_time', [
  'doctor',
  'dayOfWeek',
  'startTime',
  'endTime',
])
export class RecurringAvailability {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => DoctorProfile, { nullable: false, onDelete: 'CASCADE' })
  doctor: DoctorProfile;

  @Column()
  dayOfWeek: number;

  @Column({ type: 'time' })
  startTime: string;

  @Column({ type: 'time' })
  endTime: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
