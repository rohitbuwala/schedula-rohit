import { IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

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
  @IsString()
  bio?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  clinicAddress?: string;
}
