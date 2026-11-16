// Everything the landing page says, in one place.
// The answers and numbers are real: they come from the built-in Tunebase demo database
// (db/init/01-tunebase-demo.sql), a made-up music streaming service.

export const ASKS = [
  {
    question: 'Which genre is biggest in India?',
    answer: 'Punjabi.',
    detail: '8,167 plays. Bollywood is next with 5,911.',
    sql: `SELECT ar.genre, COUNT(*) AS plays
FROM plays p
JOIN users u    ON u.id = p.user_id
JOIN tracks t   ON t.id = p.track_id
JOIN albums al  ON al.id = t.album_id
JOIN artists ar ON ar.id = al.artist_id
WHERE u.country = 'India'
GROUP BY ar.genre
ORDER BY plays DESC`,
  },
  {
    question: 'Do premium users listen more?',
    answer: 'Yes, 2.3× more.',
    detail: '3.33 hours each, against 1.42 for free users.',
    sql: `SELECT u.plan,
       ROUND(SUM(p.seconds_played) / 3600.0
             / COUNT(DISTINCT u.id), 2) AS hours_each
FROM users u
JOIN plays p ON p.user_id = u.id
GROUP BY u.plan
ORDER BY hours_each DESC`,
  },
  {
    question: 'Where do people skip songs most?',
    answer: 'On smart speakers.',
    detail: '22.2% of plays skipped. Phones and desktops sit at 21.9%.',
    sql: `SELECT device,
       ROUND(100.0 * AVG(skipped::int), 1) AS skip_pct
FROM plays
GROUP BY device
ORDER BY skip_pct DESC`,
  },
  {
    question: 'Who is the most played artist?',
    answer: 'Saffron Atlas.',
    detail: '5,634 plays, well ahead of Golden Atlas on 3,289.',
    sql: `SELECT ar.name, COUNT(*) AS plays
FROM plays p
JOIN tracks t   ON t.id = p.track_id
JOIN albums al  ON al.id = t.album_id
JOIN artists ar ON ar.id = al.artist_id
GROUP BY ar.name
ORDER BY plays DESC
LIMIT 1`,
  },
]

// One question taken apart: each phrase is tied to the piece of SQL it turns into.
export const ANATOMY = {
  question: [
    { text: 'How many', key: 'count' },
    { text: ' ' },
    { text: 'premium users', key: 'plan' },
    { text: ' ' },
    { text: 'in India', key: 'country' },
    { text: ' signed up ' },
    { text: 'each month', key: 'month' },
    { text: '?' },
  ],
  sql: [
    { text: 'SELECT ' },
    { text: "TO_CHAR(signup_date, 'YYYY-MM') AS month", key: 'month' },
    { text: ',\n       ' },
    { text: 'COUNT(*) AS users', key: 'count' },
    { text: '\nFROM users\nWHERE ' },
    { text: "plan = 'premium'", key: 'plan' },
    { text: '\n  AND ' },
    { text: "country = 'India'", key: 'country' },
    { text: '\n' },
    { text: 'GROUP BY month', key: 'month' },
    { text: '\nORDER BY month' },
  ],
}

// The scroll walkthrough: one real question followed from the Ask button to the answer.
export const FLOW = {
  question: 'Do premium users listen more than free users?',
  steps: [
    { title: 'You ask a question', text: 'Typed the way you would say it. No query language.' },
    { title: 'It reads your tables', text: 'Names, columns and a few sample rows, so it knows what exists and picks what it needs.' },
    { title: 'The AI writes one query', text: 'A single SELECT, in the dialect your database speaks.' },
    { title: 'Four checks before it runs', text: 'The query is treated like something a stranger typed.' },
    { title: 'Your database answers', text: 'The result comes back with the SQL beside it, so you can check the working.' },
  ],
  tables: [
    ['users', '1,200', true],
    ['plays', '58,486', true],
    ['tracks', '1,256', false],
    ['albums', '143', false],
    ['artists', '60', false],
    ['playlists', '923', false],
    ['playlist_tracks', '13,670', false],
  ],
  sql: [
    'SELECT u.plan,',
    '       ROUND(SUM(p.seconds_played) / 3600.0',
    '             / COUNT(DISTINCT u.id), 2) AS hours_each',
    'FROM users u',
    'JOIN plays p ON p.user_id = u.id',
    'GROUP BY u.plan',
    'ORDER BY hours_each DESC',
  ],
  checks: [
    ['One statement, and it is a SELECT. ', 'Parsed into a syntax tree, not pattern-matched.'],
    ['Read-only transaction. ', 'The database itself refuses any write.'],
    ['Five second limit. ', 'A slow query is cancelled.'],
    ['500 row cap. ', 'A huge result cannot flood the page.'],
  ],
  answer: 'Yes, 2.3× more.',
  bars: [
    ['family', 3.37],
    ['premium', 3.33],
    ['free', 1.42],
  ],
}

export const RISKS = [
  { risk: 'The AI writes a DELETE.', fix: 'Every query is parsed into a syntax tree first. It has to be one statement, and that statement has to be a SELECT.' },
  { risk: 'Something slips past the parser.', fix: 'The query runs in a read-only transaction, so the database itself refuses to change anything.' },
  { risk: 'A query runs forever.', fix: 'It is cancelled after five seconds.' },
  { risk: 'A million rows come back.', fix: 'Results stop at 500 rows, and you are told they were cut short.' },
  { risk: 'Your database password leaks.', fix: 'It is stored with AES-256 encryption. The key is kept outside the database and the password is never sent to the browser.' },
  { risk: 'Someone opens your connection.', fix: 'Every request checks the connection belongs to the person asking.' },
]

export const STACK = ['Java 21', 'Spring Boot', 'PostgreSQL', 'MySQL', 'Spring Security', 'JWT', 'JSqlParser', 'React', 'Recharts', 'Docker']
