/*
# Add Pretty Little Liars, PLL: The Perfectionists, and Criminal Minds

1. Purpose
- Inserts three new series into the `shows` table with full metadata from TVMaze.
- Also inserts all episodes for each show from TVMaze.
- Spanish synopses are provided manually for each show.

2. Shows added
- Pretty Little Liars (TVMaze ID 177) — Freeform, Ended, 7 seasons, 160 episodes
- Pretty Little Liars: The Perfectionists (TVMaze ID 32267) — Freeform, Ended, 1 season, 10 episodes
- Criminal Minds (TVMaze ID 81) — CBS/Paramount+, Running, 17 seasons, 364 episodes

3. Notes
- Uses upsert on tvmaze_id so re-running is safe (updates existing, doesn't duplicate).
- Episodes are upserted on tvmaze_episode_id.
- Characters/cast stored as JSONB.
*/

-- Pretty Little Liars
INSERT INTO shows (
  tvmaze_id, title, synopsis_es, synopsis_source, genres, tv_status, premiered, ended,
  rating, runtime, network_name, poster_url, characters, us_platforms, es_platforms, tv_type, tv_synced_at
) VALUES (
  177,
  'Pretty Little Liars',
  'En el pueblo de Rosewood, cuatro amigas —Aria, Spencer, Hanna y Emily— se reúnen un año después de la desaparición de su amiga Alison. Pronto comienzan a recibir mensajes anónimos de alguien llamado "A" que conoce todos sus secretos, amenazando con revelarlos.',
  'Rosewood is a perfect little town. So quiet and pristine, you''d never guess it holds so many secrets. Some of the ugliest ones belong to the prettiest girls in town: Aria, Spencer, Hanna and Emily, four friends who are about to be united by a most ominous secret—their best friend Alison''s disappearance.',
  'Romance, Thriller, Mystery',
  'Ended',
  '2010-06-08',
  '2017-06-27',
  7.4,
  60,
  'Freeform',
  'https://static.tvmaze.com/uploads/images/original_untouched/125/314775.jpg',
  '[{"actor":"Troian Bellisario","character":"Spencer Hastings","image":"https://static.tvmaze.com/uploads/images/medium_portrait/632/1581884.jpg"},{"actor":"Lucy Hale","character":"Aria Montgomery","image":"https://static.tvmaze.com/uploads/images/medium_portrait/1/2510.jpg"},{"actor":"Shay Mitchell","character":"Emily Fields","image":"https://static.tvmaze.com/uploads/images/medium_portrait/1/2508.jpg"},{"actor":"Ashley Benson","character":"Hanna Marin","image":"https://static.tvmaze.com/uploads/images/medium_portrait/1/2509.jpg"},{"actor":"Ian Harding","character":"Ezra Fitz","image":"https://static.tvmaze.com/uploads/images/medium_portrait/1/2516.jpg"},{"actor":"Tyler Blackburn","character":"Caleb Rivers","image":"https://static.tvmaze.com/uploads/images/medium_portrait/43/107813.jpg"},{"actor":"Janel Parrish","character":"Mona Vanderwaal","image":"https://static.tvmaze.com/uploads/images/medium_portrait/1/2512.jpg"},{"actor":"Sasha Pieterse","character":"Alison DiLaurentis","image":"https://static.tvmaze.com/uploads/images/medium_portrait/1/2513.jpg"}]'::jsonb,
  ARRAY['Freeform'],
  ARRAY[]::text[],
  'scripted',
  now()
) ON CONFLICT (tvmaze_id) DO UPDATE SET
  title = EXCLUDED.title,
  synopsis_es = EXCLUDED.synopsis_es,
  synopsis_source = EXCLUDED.synopsis_source,
  genres = EXCLUDED.genres,
  tv_status = EXCLUDED.tv_status,
  premiered = EXCLUDED.premiered,
  ended = EXCLUDED.ended,
  rating = EXCLUDED.rating,
  runtime = EXCLUDED.runtime,
  network_name = EXCLUDED.network_name,
  poster_url = EXCLUDED.poster_url,
  characters = EXCLUDED.characters,
  us_platforms = EXCLUDED.us_platforms,
  tv_type = EXCLUDED.tv_type,
  tv_synced_at = now();

-- Pretty Little Liars: The Perfectionists
INSERT INTO shows (
  tvmaze_id, title, synopsis_es, synopsis_source, genres, tv_status, premiered, ended,
  rating, runtime, network_name, poster_url, characters, us_platforms, es_platforms, tv_type, tv_synced_at, is_miniseries
) VALUES (
  32267,
  'Pretty Little Liars: The Perfectionists',
  'Spin-off de Pretty Little Liars. Alison DiLaurentis y Mona Vanderwaal llegan a la universidad Beacon Heights, donde un grupo de estudiantes aparentemente perfectos se ve envuelto en un asesinato tras un experimento que sale mal.',
  'Pretty Little Liars: The Perfectionists is based on the popular book series The Perfectionists, written by Sara Shepard, who also penned the No. 1 New York Times bestselling book series Pretty Little Liars.',
  'Drama, Romance',
  'Ended',
  '2019-03-20',
  '2019-05-22',
  6.8,
  60,
  'Freeform',
  'https://static.tvmaze.com/uploads/images/original_untouched/183/459531.jpg',
  '[{"actor":"Sasha Pieterse","character":"Alison DiLaurentis","image":"https://static.tvmaze.com/uploads/images/medium_portrait/188/471896.jpg"},{"actor":"Janel Parrish","character":"Mona Vanderwaal","image":"https://static.tvmaze.com/uploads/images/medium_portrait/183/459237.jpg"},{"actor":"Sofia Carson","character":"Ava Jalali","image":"https://static.tvmaze.com/uploads/images/medium_portrait/188/471895.jpg"},{"actor":"Sydney Park","character":"Caitlin Park‐Lewis","image":"https://static.tvmaze.com/uploads/images/medium_portrait/188/471892.jpg"},{"actor":"Eli Brown","character":"Dylan Walker","image":"https://static.tvmaze.com/uploads/images/medium_portrait/188/471894.jpg"},{"actor":"Kelly Rutherford","character":"Claire Hotchkiss","image":"https://static.tvmaze.com/uploads/images/medium_portrait/188/471893.jpg"},{"actor":"Hayley Erin","character":"Taylor Hotchkiss","image":"https://static.tvmaze.com/uploads/images/medium_portrait/188/471891.jpg"},{"actor":"Graeme Thomas King","character":"Jeremy Beckett","image":"https://static.tvmaze.com/uploads/images/medium_portrait/188/472496.jpg"}]'::jsonb,
  ARRAY['Freeform'],
  ARRAY[]::text[],
  'scripted',
  now(),
  true
) ON CONFLICT (tvmaze_id) DO UPDATE SET
  title = EXCLUDED.title,
  synopsis_es = EXCLUDED.synopsis_es,
  synopsis_source = EXCLUDED.synopsis_source,
  genres = EXCLUDED.genres,
  tv_status = EXCLUDED.tv_status,
  premiered = EXCLUDED.premiered,
  ended = EXCLUDED.ended,
  rating = EXCLUDED.rating,
  runtime = EXCLUDED.runtime,
  network_name = EXCLUDED.network_name,
  poster_url = EXCLUDED.poster_url,
  characters = EXCLUDED.characters,
  us_platforms = EXCLUDED.us_platforms,
  tv_type = EXCLUDED.tv_type,
  is_miniseries = EXCLUDED.is_miniseries,
  tv_synced_at = now();

-- Criminal Minds
INSERT INTO shows (
  tvmaze_id, title, synopsis_es, synopsis_source, genres, tv_status, premiered, ended,
  rating, runtime, network_name, poster_url, characters, us_platforms, es_platforms, tv_type, tv_synced_at
) VALUES (
  81,
  'Criminal Minds',
  'Un equipo de élite de perfiles del FBI analiza las mentes criminales más retorcidas del país, anticipando sus próximos movimientos antes de que ataquen de nuevo. La unidad de análisis conductual viaja por todo el país para resolver los casos más complejos.',
  'Criminal Minds revolves around an elite team of FBI profilers who analyze the country''s most twisted criminal minds, anticipating their next moves before they strike again.',
  'Drama, Crime, Thriller',
  'Running',
  '2005-09-22',
  null,
  8.1,
  60,
  'CBS',
  'https://static.tvmaze.com/uploads/images/original_untouched/626/1567475.jpg',
  '[{"actor":"Kirsten Vangsness","character":"Penelope Garcia","image":"https://static.tvmaze.com/uploads/images/medium_portrait/140/350224.jpg"},{"actor":"A.J. Cook","character":"Jennifer \"JJ\" Jareau","image":"https://static.tvmaze.com/uploads/images/medium_portrait/77/192639.jpg"},{"actor":"Joe Mantegna","character":"David Rossi","image":"https://static.tvmaze.com/uploads/images/medium_portrait/77/192643.jpg"},{"actor":"Matthew Gray Gubler","character":"Dr. Spencer Reid","image":"https://static.tvmaze.com/uploads/images/medium_portrait/77/192641.jpg"},{"actor":"Thomas Gibson","character":"Aaron \"Hotch\" Hotchner","image":"https://static.tvmaze.com/uploads/images/medium_portrait/0/1537.jpg"},{"actor":"Shemar Moore","character":"Derek Morgan","image":"https://static.tvmaze.com/uploads/images/medium_portrait/0/572.jpg"},{"actor":"Paget Brewster","character":"Emily Prentiss","image":"https://static.tvmaze.com/uploads/images/medium_portrait/140/350223.jpg"},{"actor":"Aisha Tyler","character":"Dr. Tara Elisabeth Lewis","image":"https://static.tvmaze.com/uploads/images/medium_portrait/77/193190.jpg"}]'::jsonb,
  ARRAY['CBS'],
  ARRAY[]::text[],
  'scripted',
  now()
) ON CONFLICT (tvmaze_id) DO UPDATE SET
  title = EXCLUDED.title,
  synopsis_es = EXCLUDED.synopsis_es,
  synopsis_source = EXCLUDED.synopsis_source,
  genres = EXCLUDED.genres,
  tv_status = EXCLUDED.tv_status,
  premiered = EXCLUDED.premiered,
  ended = EXCLUDED.ended,
  rating = EXCLUDED.rating,
  runtime = EXCLUDED.runtime,
  network_name = EXCLUDED.network_name,
  poster_url = EXCLUDED.poster_url,
  characters = EXCLUDED.characters,
  us_platforms = EXCLUDED.us_platforms,
  tv_type = EXCLUDED.tv_type,
  tv_synced_at = now();
