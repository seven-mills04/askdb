-- Tunebase: the demo database that ships with AskDB.
-- A fictional music-streaming service. Every name and number is generated below; nothing is real.
--
-- Docker runs this file automatically the first time the PostgreSQL container starts.
-- It creates a separate database ("tunebase") and a login that can only read it.

CREATE ROLE askdb_demo LOGIN PASSWORD 'demo_readonly';   -- local demo credentials, read-only
CREATE DATABASE tunebase;
\connect tunebase

SELECT setseed(0.42);   -- same seed, same data on every machine

-- ---------------------------------------------------------------- tables

CREATE TABLE artists (
    id          INTEGER PRIMARY KEY,
    name        TEXT    NOT NULL,
    country     TEXT    NOT NULL,
    genre       TEXT    NOT NULL,
    debut_year  INTEGER NOT NULL
);

CREATE TABLE albums (
    id           INTEGER PRIMARY KEY,
    artist_id    INTEGER NOT NULL REFERENCES artists(id),
    title        TEXT    NOT NULL,
    release_date DATE    NOT NULL
);

CREATE TABLE tracks (
    id           INTEGER PRIMARY KEY,
    album_id     INTEGER NOT NULL REFERENCES albums(id),
    title        TEXT    NOT NULL,
    duration_sec INTEGER NOT NULL,
    language     TEXT    NOT NULL,
    is_explicit  BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE users (
    id          INTEGER PRIMARY KEY,
    name        TEXT    NOT NULL,
    city        TEXT    NOT NULL,
    country     TEXT    NOT NULL,
    birth_year  INTEGER NOT NULL,
    plan        TEXT    NOT NULL CHECK (plan IN ('free', 'premium', 'family')),
    signup_date DATE    NOT NULL
);

CREATE TABLE plays (
    id             INTEGER   PRIMARY KEY,
    user_id        INTEGER   NOT NULL REFERENCES users(id),
    track_id       INTEGER   NOT NULL REFERENCES tracks(id),
    played_at      TIMESTAMP NOT NULL,
    seconds_played INTEGER   NOT NULL,
    device         TEXT      NOT NULL CHECK (device IN ('mobile', 'desktop', 'smart_speaker', 'tv')),
    skipped        BOOLEAN   NOT NULL DEFAULT FALSE
);

CREATE TABLE playlists (
    id         INTEGER   PRIMARY KEY,
    user_id    INTEGER   NOT NULL REFERENCES users(id),
    name       TEXT      NOT NULL,
    is_public  BOOLEAN   NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL
);

CREATE TABLE playlist_tracks (
    playlist_id INTEGER   NOT NULL REFERENCES playlists(id),
    track_id    INTEGER   NOT NULL REFERENCES tracks(id),
    position    INTEGER   NOT NULL,
    added_at    TIMESTAMP NOT NULL,
    PRIMARY KEY (playlist_id, track_id)
);

-- ---------------------------------------------------------------- helpers (dropped at the end)

-- Picks one element; listing a value several times makes it more likely.
CREATE FUNCTION pick(items TEXT[]) RETURNS TEXT LANGUAGE sql VOLATILE AS
$$ SELECT items[1 + floor(random() * array_length(items, 1))::int] $$;

CREATE FUNCTION rand_between(lo INT, hi INT) RETURNS INT LANGUAGE sql VOLATILE AS
$$ SELECT lo + floor(random() * (hi - lo + 1))::int $$;

-- A title made of 1 to 3 different words.
CREATE FUNCTION make_title() RETURNS TEXT LANGUAGE sql VOLATILE AS
$$
    SELECT string_agg(w, ' ')
    FROM (
        SELECT w FROM unnest(ARRAY[
            'Late','Night','Drive','Blue','Summer','Rain','City','Lights','Home','Fire','Slow','Dance',
            'Ghost','Gold','Waves','Dreams','Run','Heart','Static','Morning','Stars','Window','Highway',
            'Echoes','Paper','Sky','Neon','Shadow','Coffee','Monsoon','Satellite','Letters','Mirror','Tide']) w
        ORDER BY random()
        LIMIT rand_between(1, 3)
    ) picked
$$;

CREATE TABLE places (id INT PRIMARY KEY, city TEXT, country TEXT);
INSERT INTO places
SELECT row_number() OVER (), city, country
FROM (VALUES
    ('Mumbai','India'),('Delhi','India'),('Bengaluru','India'),('Pune','India'),('Hyderabad','India'),
    ('Chennai','India'),('Kolkata','India'),('Jaipur','India'),('Lucknow','India'),('Ahmedabad','India'),
    ('Mumbai','India'),('Delhi','India'),('Bengaluru','India'),('Pune','India'),('Hyderabad','India'),
    ('New York','United States'),('Austin','United States'),('Chicago','United States'),
    ('Seattle','United States'),('Los Angeles','United States'),
    ('London','United Kingdom'),('Manchester','United Kingdom'),('Bristol','United Kingdom'),
    ('Berlin','Germany'),('Hamburg','Germany'),
    ('Tokyo','Japan'),('Osaka','Japan'),
    ('Sao Paulo','Brazil'),('Rio de Janeiro','Brazil')
) AS p(city, country);

-- ---------------------------------------------------------------- artists (60)

INSERT INTO artists
SELECT row_number() OVER (), names.name, p.country,
       CASE WHEN p.country = 'India' AND random() < 0.4 THEN pick(ARRAY['Bollywood','Punjabi'])
            ELSE pick(ARRAY['Indie Pop','Hip-Hop','Electronic','Rock','Lo-fi','Jazz','R&B','Classical']) END,
       rand_between(1998, 2023)
FROM (
    SELECT a || ' ' || b AS name, rand_between(1, 29) AS place_id
    FROM unnest(ARRAY['Velvet','Neon','Paper','Silent','Midnight','Copper','Lunar','Static','Saffron','Glass',
                      'Echo','Monsoon','Wild','Cobalt','Hollow','Golden','Northern','Electric','Quiet','Desert']) a,
         unnest(ARRAY['Harbor','Tigers','Rivers','Circuit','Lanterns','Owls','Atlas','Signals','Gardens','Machines',
                      'Comets','Kites','Arcade','Weather','Satellites','Parade','Bloom','Theory','Engines','Tides']) b
    ORDER BY random()
    LIMIT 60
) names
JOIN places p ON p.id = names.place_id;

-- A few artists are hits, most are not (log-normal popularity).
CREATE TABLE artist_popularity AS
SELECT id AS artist_id, exp(0.8 * random_normal()) AS popularity FROM artists;

-- ---------------------------------------------------------------- albums (1 to 4 per artist)

INSERT INTO albums
SELECT row_number() OVER (), a.id, make_title(),
       make_date(rand_between(greatest(a.debut_year, 2015), 2025), rand_between(1, 12), rand_between(1, 28))
FROM artists a
CROSS JOIN LATERAL generate_series(1, rand_between(1, 4) + a.id * 0) n;

-- ---------------------------------------------------------------- tracks (6 to 12 per album)

CREATE TABLE track_weight (track_id INT PRIMARY KEY, weight DOUBLE PRECISION, cumulative DOUBLE PRECISION);

WITH new_tracks AS (
    SELECT row_number() OVER ()::int AS id, al.id AS album_id, n AS track_no, ar.genre, ar.country, ap.popularity
    FROM albums al
    JOIN artists ar ON ar.id = al.artist_id
    JOIN artist_popularity ap ON ap.artist_id = ar.id
    CROSS JOIN LATERAL generate_series(1, rand_between(6, 12) + al.id * 0) n
), inserted AS (
    INSERT INTO tracks
    SELECT id, album_id, make_title(), rand_between(125, 330),
           CASE genre WHEN 'Bollywood' THEN 'Hindi' WHEN 'Punjabi' THEN 'Punjabi' WHEN 'Classical' THEN 'Instrumental'
                ELSE CASE WHEN country = 'India' AND random() < 0.5 THEN 'Hindi' ELSE 'English' END END,
           genre = 'Hip-Hop' AND random() < 0.6
    FROM new_tracks
)
-- Opening tracks of an album get played more.
INSERT INTO track_weight (track_id, weight)
SELECT id, popularity * (CASE WHEN track_no <= 2 THEN 1.6 ELSE 1.0 END) * (0.3 + random() * 1.4)
FROM new_tracks;

UPDATE track_weight tw SET cumulative = c.cumulative
FROM (SELECT track_id, sum(weight) OVER (ORDER BY track_id) AS cumulative FROM track_weight) c
WHERE c.track_id = tw.track_id;
CREATE INDEX ON track_weight (cumulative);

-- Picks a track at random, popular tracks more often.
CREATE FUNCTION pick_track() RETURNS INT LANGUAGE sql VOLATILE AS
$$
    SELECT track_id FROM track_weight
    WHERE cumulative >= (SELECT random() * max(cumulative) FROM track_weight)   -- one dice roll per call
    ORDER BY cumulative
    LIMIT 1
$$;

-- ---------------------------------------------------------------- users (1,200)

INSERT INTO users
SELECT g,
       pick(ARRAY['Aarav','Vivaan','Aditya','Ananya','Diya','Ishaan','Kabir','Meera','Riya','Saanvi','Arjun',
                  'Rohan','Priya','Neha','Karan','Tanvi','Dev','Zoya','Aisha','Vikram','Emma','Liam','Olivia',
                  'Noah','Mia','Lucas','Sofia','Kenji','Yuki','Hannah','Felix','Ana','Mateo'])
       || ' ' ||
       pick(ARRAY['Sharma','Verma','Iyer','Reddy','Kapoor','Mehta','Nair','Gupta','Singh','Das','Joshi','Rao',
                  'Patel','Khan','Bose','Smith','Johnson','Brown','Tanaka','Sato','Muller','Schmidt','Silva',
                  'Costa','Taylor','Walker']),
       p.city, p.country,
       rand_between(1965, 2008),
       pick(ARRAY['free','free','free','free','free','free','free','free','free','free','free',
                  'premium','premium','premium','premium','premium','premium','premium','family','family']),
       DATE '2022-01-01' + rand_between(0, 1760)
FROM generate_series(1, 1200) g
JOIN places p ON p.id = 1 + (hashint4(g) & 2147483647) % 29;

-- ---------------------------------------------------------------- plays (~55,000)

-- Evenings are busier: each hour appears in this list as often as it should be picked.
CREATE TABLE hour_pool AS
SELECT array_agg(h) AS hours
FROM (VALUES (0,2),(1,1),(2,1),(3,1),(4,1),(5,2),(6,4),(7,6),(8,7),(9,6),(10,5),(11,5),(12,6),(13,6),
             (14,5),(15,5),(16,6),(17,7),(18,9),(19,10),(20,10),(21,9),(22,7),(23,4)) AS w(h, weight),
     generate_series(1, weight);

WITH listeners AS (
    -- Paying users listen more.
    SELECT u.id AS user_id, u.birth_year,
           greatest(u.signup_date, DATE '2025-05-01') AS first_day,
           floor(-ln(1 - random()) * CASE WHEN u.plan = 'free' THEN 30 ELSE 70 END)::int AS play_count
    FROM users u
    WHERE u.signup_date < DATE '2026-10-31'
), raw AS (
    SELECT l.user_id, l.birth_year,
           pick_track() AS track_id,
           l.first_day
             + rand_between(0, (DATE '2026-10-31' - l.first_day)) * INTERVAL '1 day'
             + (SELECT hours[rand_between(1, array_length(hours, 1)) + n * 0] FROM hour_pool) * INTERVAL '1 hour'
             + rand_between(0, 3599) * INTERVAL '1 second' AS played_at,
           random() < 0.22 AS skipped,
           random() AS device_roll,
           random() AS listen_share
    FROM listeners l
    CROSS JOIN LATERAL generate_series(1, l.play_count + l.user_id * 0) n
)
INSERT INTO plays
SELECT row_number() OVER (ORDER BY r.played_at),
       r.user_id, r.track_id, r.played_at,
       CASE WHEN r.skipped THEN 5 + floor(r.listen_share * 36)::int
            ELSE floor(t.duration_sec * (0.85 + r.listen_share * 0.15))::int END,
       -- Younger listeners are mostly on mobile.
       CASE WHEN r.birth_year > 1990 THEN
                CASE WHEN r.device_roll < 0.70 THEN 'mobile' WHEN r.device_roll < 0.88 THEN 'desktop'
                     WHEN r.device_roll < 0.96 THEN 'smart_speaker' ELSE 'tv' END
            ELSE
                CASE WHEN r.device_roll < 0.45 THEN 'mobile' WHEN r.device_roll < 0.80 THEN 'desktop'
                     WHEN r.device_roll < 0.94 THEN 'smart_speaker' ELSE 'tv' END
       END,
       r.skipped
FROM raw r
JOIN tracks t ON t.id = r.track_id;

-- ---------------------------------------------------------------- playlists (~900) and their tracks

INSERT INTO playlists
SELECT row_number() OVER (), u.id,
       pick(ARRAY['Gym Mix','Chill Evenings','Road Trip','Focus Mode','Rainy Day','Party Starters',
                  'Sunday Morning','Late Night Drive','Throwbacks','Study Session','Heartbreak Hotel','Discover']),
       random() < 0.4,
       TIMESTAMP '2025-01-01' + rand_between(0, 639) * INTERVAL '1 day' + rand_between(0, 86399) * INTERVAL '1 second'
FROM (SELECT id FROM users ORDER BY random() LIMIT 450) u
CROSS JOIN LATERAL generate_series(1, rand_between(1, 3) + u.id * 0) n;

INSERT INTO playlist_tracks
SELECT playlist_id, track_id, row_number() OVER (PARTITION BY playlist_id ORDER BY added_at), added_at
FROM (
    SELECT DISTINCT ON (p.id, picked.track_id)
           p.id AS playlist_id, picked.track_id,
           p.created_at + rand_between(0, 59) * INTERVAL '1 day' AS added_at
    FROM playlists p
    CROSS JOIN LATERAL (
        SELECT pick_track() AS track_id FROM generate_series(1, rand_between(5, 25) + p.id * 0)
    ) picked
) unique_tracks;

-- ---------------------------------------------------------------- tidy up

DROP FUNCTION pick_track();
DROP FUNCTION make_title();
DROP FUNCTION rand_between(INT, INT);
DROP FUNCTION pick(TEXT[]);
DROP TABLE track_weight, artist_popularity, places, hour_pool;

CREATE INDEX idx_plays_user    ON plays (user_id);
CREATE INDEX idx_plays_track   ON plays (track_id);
CREATE INDEX idx_plays_time    ON plays (played_at);
CREATE INDEX idx_tracks_album  ON tracks (album_id);
CREATE INDEX idx_albums_artist ON albums (artist_id);
ANALYZE;

-- The demo login can read these tables and nothing else.
GRANT CONNECT ON DATABASE tunebase TO askdb_demo;
GRANT USAGE ON SCHEMA public TO askdb_demo;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO askdb_demo;
