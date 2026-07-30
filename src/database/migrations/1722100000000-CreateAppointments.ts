import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAppointments1722100000000 implements MigrationInterface {
  name = 'CreateAppointments1722100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."appointments_scheduling_type_enum" AS ENUM('STREAM', 'WAVE')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."appointments_status_enum" AS ENUM('BOOKED', 'CANCELLED')`,
    );
    await queryRunner.query(
      `CREATE TABLE "appointments" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "date" date NOT NULL, "schedulingType" "public"."appointments_scheduling_type_enum" NOT NULL, "source" character varying NOT NULL, "startTime" TIME NOT NULL, "endTime" TIME NOT NULL, "tokenNumber" integer, "status" "public"."appointments_status_enum" NOT NULL DEFAULT 'BOOKED', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "doctorId" uuid NOT NULL, "patientId" uuid NOT NULL, CONSTRAINT "PK_appointments_id" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_appointments_booked_patient_slot" ON "appointments" ("doctorId", "patientId", "date", "schedulingType", "source", "startTime", "endTime") WHERE "status" = 'BOOKED'`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_appointments_booked_wave_token" ON "appointments" ("doctorId", "date", "schedulingType", "source", "startTime", "endTime", "tokenNumber") WHERE "status" = 'BOOKED' AND "tokenNumber" IS NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "appointments" ADD CONSTRAINT "FK_appointments_doctor_id" FOREIGN KEY ("doctorId") REFERENCES "doctor_profiles"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "appointments" ADD CONSTRAINT "FK_appointments_patient_id" FOREIGN KEY ("patientId") REFERENCES "patient_profiles"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "appointments" DROP CONSTRAINT "FK_appointments_patient_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "appointments" DROP CONSTRAINT "FK_appointments_doctor_id"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_appointments_booked_wave_token"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_appointments_booked_patient_slot"`,
    );
    await queryRunner.query(`DROP TABLE "appointments"`);
    await queryRunner.query(`DROP TYPE "public"."appointments_status_enum"`);
    await queryRunner.query(
      `DROP TYPE "public"."appointments_scheduling_type_enum"`,
    );
  }
}
