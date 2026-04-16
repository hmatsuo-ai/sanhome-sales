-- CreateIndex
CREATE INDEX "expenses_date_idx" ON "expenses"("date");

-- CreateIndex
CREATE INDEX "expenses_user_id_idx" ON "expenses"("user_id");

-- CreateIndex
CREATE INDEX "sales_date_idx" ON "sales"("date");

-- CreateIndex
CREATE INDEX "sales_user_id_idx" ON "sales"("user_id");

-- CreateIndex
CREATE INDEX "schedules_start_time_idx" ON "schedules"("start_time");

-- CreateIndex
CREATE INDEX "schedules_user_id_idx" ON "schedules"("user_id");

-- CreateIndex
CREATE INDEX "users_role_is_active_idx" ON "users"("role", "is_active");
