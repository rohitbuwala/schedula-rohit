import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateRecurringAvailabilities1721700000000
  implements MigrationInterface
{
  name = 'CreateRecurringAvailabilities1721700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "recurring_availabilities" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "dayOfWeek" integer NOT NULL, "startTime" TIME NOT NULL, "endTime" TIME NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "doctorId" uuid NOT NULL, CONSTRAINT "CHK_recurring_availabilities_day_of_week" CHECK ("dayOfWeek" >= 0 AND "dayOfWeek" <= 6), CONSTRAINT "CHK_recurring_availabilities_time_order" CHECK ("startTime" < "endTime"), CONSTRAINT "UQ_recurring_availabilities_doctor_day_time" UNIQUE ("doctorId", "dayOfWeek", "startTime", "endTime"), CONSTRAINT "PK_recurring_availabilities_id" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "recurring_availabilities" ADD CONSTRAINT "FK_recurring_availabilities_doctor_id" FOREIGN KEY ("doctorId") REFERENCES "doctor_profiles"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "recurring_availabilities" DROP CONSTRAINT "FK_recurring_availabilities_doctor_id"`,
    );
    await queryRunner.query(`DROP TABLE "recurring_availabilities"`);
  }
}
