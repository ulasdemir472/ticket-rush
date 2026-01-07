-- Clear existing data
TRUNCATE TABLE seats CASCADE;
TRUNCATE TABLE events CASCADE;

-- Insert Events
INSERT INTO events (id, title, description, date, location, total_seats, created_at, updated_at)
VALUES 
    ('evt-1', 'Avengers: Secret Wars', 'The epic conclusion to the multiverse saga.', NOW() + INTERVAL '7 days', 'IMAX Hall 1', 50, NOW(), NOW()),
    ('evt-2', 'Coldplay Live in Istanbul', 'Music of the Spheres World Tour.', NOW() + INTERVAL '30 days', 'Olympic Stadium', 100, NOW(), NOW());

-- Insert Seats for Event 1 (50 Seats)
DO $$
DECLARE
    r INT;
    price DECIMAL := 15.00;
BEGIN
    FOR r IN 1..50 LOOP
        INSERT INTO seats (id, event_id, seat_number, status, price, version, created_at, updated_at)
        VALUES (
            gen_random_uuid()::text, 
            'evt-1', 
            'A-' || r, 
            'AVAILABLE', 
            price, 
            1, 
            NOW(), 
            NOW()
        );
    END LOOP;
END $$;

-- Insert Seats for Event 2 (100 Seats with different prices)
DO $$
DECLARE
    r INT;
    price DECIMAL;
BEGIN
    FOR r IN 1..100 LOOP
        -- VIP first 20 seats
        IF r <= 20 THEN
            price := 150.00;
        ELSE
            price := 75.00;
        END IF;

        INSERT INTO seats (id, event_id, seat_number, status, price, version, created_at, updated_at)
        VALUES (
            gen_random_uuid()::text, 
            'evt-2', 
            'B-' || r, 
            'AVAILABLE', 
            price, 
            1, 
            NOW(), 
            NOW()
        );
    END LOOP;
END $$;
