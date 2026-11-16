// Starter queries for the built-in demo database (PostgreSQL).

export const EXAMPLES = [
  {
    label: 'Top 10 artists by plays',
    sql: `SELECT ar.name AS artist, ar.genre, COUNT(*) AS plays
FROM plays p
JOIN tracks t   ON t.id = p.track_id
JOIN albums al  ON al.id = t.album_id
JOIN artists ar ON ar.id = al.artist_id
GROUP BY ar.id, ar.name, ar.genre
ORDER BY plays DESC
LIMIT 10;`,
  },
  {
    label: 'Skip rate by device',
    sql: `SELECT device,
       COUNT(*) AS plays,
       ROUND(100.0 * AVG(skipped::int), 1) AS skip_rate_pct
FROM plays
GROUP BY device
ORDER BY plays DESC;`,
  },
  {
    label: 'Busiest listening hours',
    sql: `SELECT EXTRACT(HOUR FROM played_at)::int AS hour,
       COUNT(*) AS plays
FROM plays
GROUP BY hour
ORDER BY hour;`,
  },
  {
    label: 'Premium vs free listening',
    sql: `SELECT u.plan,
       COUNT(DISTINCT u.id) AS users,
       ROUND(SUM(p.seconds_played) / 3600.0, 1) AS hours_listened,
       ROUND(SUM(p.seconds_played) / 3600.0 / COUNT(DISTINCT u.id), 2) AS hours_per_user
FROM users u
JOIN plays p ON p.user_id = u.id
GROUP BY u.plan
ORDER BY hours_per_user DESC;`,
  },
  {
    label: 'Monthly active listeners',
    sql: `SELECT TO_CHAR(played_at, 'YYYY-MM') AS month,
       COUNT(DISTINCT user_id) AS active_listeners
FROM plays
GROUP BY month
ORDER BY month;`,
  },
]

// Starter questions for the demo database, shown when AI is switched on.
export const EXAMPLE_QUESTIONS = [
  'Who are the top 10 artists by plays?',
  'Which device do people skip songs on the most?',
  'How many listeners were active each month?',
  'Do premium users listen more than free users?',
  'Which genres are most popular in India?',
]
