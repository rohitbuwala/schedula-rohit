import { IsOptional, IsString, Matches } from 'class-validator';

const datePattern = /^\d{4}-\d{2}-\d{2}$/;

export class GetWaveAvailabilityQueryDto {
  @IsString()
  @Matches(datePattern, {
    message: 'date must be in YYYY-MM-DD format',
  })
  date: string;

  @IsOptional()
  @IsString()
  bookedPatients?: string;
}
