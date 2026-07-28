import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDoctorSchedulingSettings1721900000000 implements MigrationInterface {
  name = 'AddDoctorSchedulingSettings1721900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."doctor_profiles_scheduling_type_enum" AS ENUM('STREAM', 'WAVE')`,
    );
    await queryRunner.query(
      `ALTER TABLE "doctor_profiles" ADD "schedulingType" "public"."doctor_profiles_scheduling_type_enum" NOT NULL DEFAULT 'STREAM'`,
    );
    await queryRunner.query(
      `ALTER TABLE "doctor_profiles" ADD "slotDurationMinutes" integer NOT NULL DEFAULT 30`,
    );
    await queryRunner.query(
      `ALTER TABLE "doctor_profiles" ADD "bufferTimeMinutes" integer NOT NULL DEFAULT 0`,
    );
    await queryRunner.query(
      `ALTER TABLE "doctor_profiles" ADD CONSTRAINT "CHK_doctor_profiles_slot_duration" CHECK ("slotDurationMinutes" > 0 AND "slotDurationMinutes" <= 480)`,
    );
    await queryRunner.query(
      `ALTER TABLE "doctor_profiles" ADD CONSTRAINT "CHK_doctor_profiles_buffer_time" CHECK ("bufferTimeMinutes" >= 0 AND "bufferTimeMinutes" <= 240)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "doctor_profiles" DROP CONSTRAINT "CHK_doctor_profiles_buffer_time"`,
    );
    await queryRunner.query(
      `ALTER TABLE "doctor_profiles" DROP CONSTRAINT "CHK_doctor_profiles_slot_duration"`,
    );
    await queryRunner.query(
      `ALTER TABLE "doctor_profiles" DROP COLUMN "bufferTimeMinutes"`,
    );
    await queryRunner.query(
      `ALTER TABLE "doctor_profiles" DROP COLUMN "slotDurationMinutes"`,
    );
    await queryRunner.query(
      `ALTER TABLE "doctor_profiles" DROP COLUMN "schedulingType"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."doctor_profiles_scheduling_type_enum"`,
    );
  }
}
