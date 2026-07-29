import { IsNotEmpty, IsString, IsUUID, Matches } from 'class-validator';

const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const timePattern = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/;

export class CreateAppointmentDto {
  @IsUUID()
  doctorId: string;

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
