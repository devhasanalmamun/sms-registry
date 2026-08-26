-- Defence in depth: the application validates these too, but the database is
-- the last line that a bad script or a manual UPDATE cannot talk its way past.

ALTER TABLE "results"
  ADD CONSTRAINT "results_score_range" CHECK ("score" >= 0 AND "score" <= 100);

ALTER TABLE "fee_charges"
  ADD CONSTRAINT "fee_charges_amount_positive" CHECK ("amount" > 0);

ALTER TABLE "payments"
  ADD CONSTRAINT "payments_amount_positive" CHECK ("amount" > 0);

ALTER TABLE "students"
  ADD CONSTRAINT "students_academic_year_range" CHECK ("academicYear" >= 1 AND "academicYear" <= 7);
