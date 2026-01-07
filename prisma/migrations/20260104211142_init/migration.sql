-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('CUSTOMER', 'ADMIN');

-- CreateEnum
CREATE TYPE "SeatStatus" AS ENUM ('AVAILABLE', 'LOCKED', 'SOLD');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'CUSTOMER',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "events" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "location" TEXT NOT NULL,
    "total_seats" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "seats" (
    "id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "seat_number" TEXT NOT NULL,
    "status" "SeatStatus" NOT NULL DEFAULT 'AVAILABLE',
    "price" DECIMAL(10,2) NOT NULL,
    "user_id" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "seats_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "events_date_idx" ON "events"("date");

-- CreateIndex
CREATE INDEX "events_created_at_idx" ON "events"("created_at");

-- CreateIndex
CREATE INDEX "seats_event_id_idx" ON "seats"("event_id");

-- CreateIndex
CREATE INDEX "seats_status_idx" ON "seats"("status");

-- CreateIndex
CREATE INDEX "seats_user_id_idx" ON "seats"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "seats_event_id_seat_number_key" ON "seats"("event_id", "seat_number");

-- AddForeignKey
ALTER TABLE "seats" ADD CONSTRAINT "seats_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
