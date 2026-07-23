import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
} from 'class-validator';

const timePattern = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/;

export class CreateRecurringAvailabilityDto {
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek: number;

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

export class UpdateRecurringAvailabilityDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek?: number;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @Matches(timePattern, {
    message: 'startTime must be in HH:mm or HH:mm:ss format',
  })
  startTime?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @Matches(timePattern, {
    message: 'endTime must be in HH:mm or HH:mm:ss format',
  })
  endTime?: string;
}
