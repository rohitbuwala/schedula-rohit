import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { SchedulingType } from '../scheduling-type.enum';

export class CreateDoctorProfileDto {
  @IsString()
  @IsNotEmpty()
  specialization: string;

  @IsString()
  @IsNotEmpty()
  qualification: string;

  @IsInt()
  @Min(0)
  experienceYears: number;

  @IsInt()
  @Min(0)
  consultationFee: number;

  @IsOptional()
  @IsEnum(SchedulingType)
  schedulingType?: SchedulingType;

  @IsOptional()
  @IsInt()
  @Min(1)
  maxPatientCapacity?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(480)
  slotDurationMinutes?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(240)
  bufferTimeMinutes?: number;

  @IsOptional()
  @IsString()
  bio?: string;

  @IsString()
  @IsNotEmpty()
  clinicAddress: string;
}

export class UpdateDoctorProfileDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  specialization?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  qualification?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  experienceYears?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  consultationFee?: number;

  @IsOptional()
  @IsEnum(SchedulingType)
  schedulingType?: SchedulingType;

  @IsOptional()
  @IsInt()
  @Min(1)
  maxPatientCapacity?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(480)
  slotDurationMinutes?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(240)
  bufferTimeMinutes?: number;

  @IsOptional()
  @IsString()
  bio?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  clinicAddress?: string;
}
