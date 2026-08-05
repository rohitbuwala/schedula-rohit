import { IsNotEmpty, IsString, Matches } from 'class-validator';
import { datePattern, timePattern } from './create-appointment.dto';

export class RescheduleAppointmentDto {
  @IsString()
  @IsNotEmpty()
  @Matches(datePattern, {
    message: 'date must be in YYYY-MM-DD format',
  })
  date: string;

  @IsString()
  @IsNotEmpty()
  @Matches(timePattern, {
    message: 'startTime must be in HH:mm or HH:mm:ss format',
  })
  startTime: string;

  @IsString()
  @IsNotEmpty()
  @Matches(timePattern, {
    message: 'endTime must be in HH:mm or HH:mm:ss format',
  })
  endTime: string;
}
