/*
# SerieVerse catalog: shows, episodes and daily sync state

1. New Tables
- `shows`: catalog of series. Each row links to a TVMaze show id and stores the
  Spanish synopsis, US and Spanish platforms (arrays), and TVMaze-synced metadata
  (status, premiere/end dates, rating, runtime, poster, cast characters).
- `episodes`: every episode of every catalog show (season, number, airdate in US).
- `catalog_sync`: single-row table recording when the last full daily sync ran.

2. Seed data
- 50 curated series inserted with their TVMaze ids and platforms. Metadata is
  filled in by the sync function.

3. Security
- RLS enabled on all three tables.
- `shows` and `episodes` are public catalog data: anon and authenticated can read.
- `catalog_sync` has no client access; only the server (service role) uses it.
- Admin write policies for `shows` are added in the users migration, once the
  admin check function exists.

4. Important notes
- No data is dropped or altered; this migration only creates tables and inserts seed rows.
- Re-running is safe: tables use IF NOT EXISTS and seed inserts skip existing tvmaze ids.
*/

CREATE TABLE IF NOT EXISTS shows (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tvmaze_id integer NOT NULL UNIQUE,
  title text NOT NULL,
  synopsis_es text,
  synopsis_source text,
  genres text,
  us_platforms text[] NOT NULL DEFAULT '{}',
  es_platforms text[] NOT NULL DEFAULT '{}',
  poster_url text,
  tv_status text,
  premiered date,
  ended date,
  rating numeric(3,1),
  runtime integer,
  network_name text,
  characters jsonb NOT NULL DEFAULT '[]'::jsonb,
  tv_synced_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS episodes (
  tvmaze_episode_id integer PRIMARY KEY,
  show_id bigint NOT NULL REFERENCES shows(id) ON DELETE CASCADE,
  season integer NOT NULL,
  number integer NOT NULL,
  name text,
  airdate date NOT NULL,
  runtime integer,
  episode_type text
);

CREATE INDEX IF NOT EXISTS episodes_show_id_idx ON episodes (show_id, season, number);
CREATE INDEX IF NOT EXISTS episodes_airdate_idx ON episodes (airdate);

CREATE TABLE IF NOT EXISTS catalog_sync (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  last_synced_at timestamptz
);

ALTER TABLE shows ENABLE ROW LEVEL SECURITY;
ALTER TABLE episodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalog_sync ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON shows TO anon, authenticated;
GRANT SELECT ON episodes TO anon, authenticated;
GRANT ALL ON shows, episodes, catalog_sync TO service_role;

DROP POLICY IF EXISTS "public_read_shows" ON shows;
CREATE POLICY "public_read_shows" ON shows FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "public_read_episodes" ON episodes;
CREATE POLICY "public_read_episodes" ON episodes FOR SELECT
  TO anon, authenticated USING (true);

INSERT INTO shows (tvmaze_id, title, us_platforms, es_platforms, synopsis_es) VALUES
  (67, 'Grey''s Anatomy', '{"ABC"}', '{"Disney+"}', 'Drama médico ambientado en el Hospital Grey Sloan Memorial de Seattle, donde los cirujanos afrontan su vida profesional y personal.'),
  (44778, 'House of the Dragon', '{"HBO"}', '{"HBO Max"}', 'Precuela de Juego de Tronos sobre la guerra civil de la casa Targaryen, dos siglos antes de los hechos de la serie original.'),
  (82, 'Game of Thrones', '{"HBO"}', '{"HBO Max"}', 'Nueve familias nobles luchan por el Trono de Hierro de Poniente mientras se acerca una amenaza ancestral.'),
  (46562, 'The Last of Us', '{"HBO"}', '{"HBO Max"}', 'Joel y Ellie atraviesan Estados Unidos en un mundo postapocalíptico devastado por una epidemia.'),
  (51394, 'The White Lotus', '{"HBO"}', '{"HBO Max"}', 'Antología satírica que sigue a huéspedes y personal de hoteles de lujo en distintos rincones del mundo.'),
  (45501, 'Industry', '{"HBO"}', '{"HBO Max"}', 'Jóvenes becarios compiten por un puesto fijo en un banco de inversión de Londres.'),
  (28826, 'Euphoria', '{"HBO"}', '{"HBO Max"}', 'Adolescentes de un instituto afrontan drogas, identidad, amor y redes sociales.'),
  (75632, 'The Pitt', '{"HBO Max"}', '{"HBO Max"}', 'Un médico de urgencias de Pittsburgh dirige un turno de 15 horas en un hospital bajo presión.'),
  (50603, 'Peacemaker', '{"HBO Max"}', '{"HBO Max"}', 'Un agente dispuesto a todo por la paz se enfrenta a nuevos enemigos en el universo DC.'),
  (54914, 'Hacks', '{"HBO Max"}', '{"HBO Max"}', 'Una veterana humorista de Las Vegas y una joven guionista crean un espectáculo juntas.'),
  (44933, 'Severance', '{"Apple TV+"}', '{"Apple TV+"}', 'Empleados someten su memoria a un procedimiento que separa su vida laboral de la personal.'),
  (44458, 'Ted Lasso', '{"Apple TV+"}', '{"Apple TV+"}', 'Un entrenador de fútbol americano dirige un equipo de fútbol inglés con un optimismo contagioso.'),
  (45039, 'Slow Horses', '{"Apple TV+"}', '{"Apple TV+"}', 'Agentes del MI5 degradados a un departamento de fracasados investigan una conspiración.'),
  (38052, 'Silo', '{"Apple TV+"}', '{"Apple TV+"}', 'Los últimos habitantes de la Tierra viven en un silo subterráneo con normas estrictas.'),
  (35951, 'Foundation', '{"Apple TV+"}', '{"Apple TV+"}', 'Adaptación de la saga de Asimov sobre un matemático que intenta preservar el conocimiento humano.'),
  (86175, 'Pluribus', '{"Apple TV+"}', '{"Apple TV+"}', NULL),
  (53647, 'Wednesday', '{"Netflix"}', '{"Netflix"}', 'Wednesday Addams investiga una serie de asesinatos mientras estudia en la Academia Nevermore.'),
  (305, 'Black Mirror', '{"Netflix"}', '{"Netflix"}', 'Antología de ciencia ficción que explora los efectos perversos de la tecnología en la sociedad.'),
  (2993, 'Stranger Things', '{"Netflix"}', '{"Netflix"}', 'En los años 80, un grupo de amigos de Hawkins se enfrenta a fenómenos sobrenaturales.'),
  (55138, 'Arcane', '{"Netflix"}', '{"Netflix"}', 'Dos hermanas de Piltover y Zaun se ven envueltas en una lucha por el futuro de sus ciudades.'),
  (169, 'Breaking Bad', '{"AMC"}', '{"Netflix"}', 'Un profesor de química con cáncer se asocia con un exalumno para fabricar metanfetamina.'),
  (27436, 'La Casa de Papel', '{}', '{"Netflix"}', 'Un misterioso genio criminal reúne a ocho ladrones para dar el mayor atraco de la historia.'),
  (37854, 'Élite', '{}', '{"Netflix"}', 'Estudiantes de un colegio privado de Madrid se ven envueltos en un asesinato.'),
  (25499, 'Las Chicas del Cable', '{}', '{"Netflix"}', 'En los años 20 en Madrid, cuatro telefonistas se unen para resolver un crimen.'),
  (1763, 'El Ministerio del Tiempo', '{}', '{"RTVE Play"}', 'Agentes viajan en el tiempo para proteger la historia de España de alteraciones.'),
  (1695, 'Cuéntame cómo pasó', '{}', '{"RTVE Play"}', 'Crónica de la vida de una familia española desde los años 60 hasta la actualidad.'),
  (47042, 'Veneno', '{}', '{"Atresplayer"}', 'Biopic sobre Cristina Ortiz, conocida como La Veneno, y su paso a la fama en los años 90.'),
  (41538, 'Hierro', '{}', '{"Movistar Plus+"}', 'Tras la desaparición de un niño en una isla canaria, la policía investiga un caso que lo cambia todo.'),
  (49041, 'Fallout', '{"Prime Video"}', '{"Prime Video"}', 'Supervivientes de un refugio nuclear salen a un mundo devastado en el siglo XXIII.'),
  (37196, 'Invincible', '{"Prime Video"}', '{"Prime Video"}', 'Un adolescente hereda los poderes de un superhéroe y debe asumir su destino.'),
  (43031, 'Reacher', '{"Prime Video"}', '{"Prime Video"}', 'Un exmilitar errante investiga crímenes en pequeñas localidades de Estados Unidos.'),
  (43094, 'Hazbin Hotel', '{"Prime Video"}', '{"Prime Video"}', 'En el infierno, la hija del diablo intenta redimir un hotel para demonios.'),
  (15299, 'The Boys', '{"Prime Video"}', '{"Prime Video"}', 'Un grupo de vigilantes lucha contra superhéroes corruptos que abusan de su poder.'),
  (52341, 'Andor', '{"Disney+"}', '{"Disney+"}', 'Precuela de Rogue One que sigue a Cassian Andor antes de convertirse en héroe rebelde.'),
  (38963, 'The Mandalorian', '{"Disney+"}', '{"Disney+"}', 'Un cazarrecompensas protege a un misterioso pequeño ser en los confines de la galaxia.'),
  (52336, 'Alien: Earth', '{"Hulu"}', '{"Disney+"}', 'Precuela de la saga Alien ambientada en la Tierra, poco antes de los hechos de la película original.'),
  (48830, 'Only Murders in the Building', '{"Hulu"}', '{"Disney+"}', 'Tres vecinos de un edificio de Nueva York se convierten en detectives aficionados tras un asesinato.'),
  (37336, 'Shōgun', '{"Hulu"}', '{"Disney+"}', 'En el Japón de 1600, un señor feudal y un navegante inglés forjan una alianza peligrosa.'),
  (54198, 'The Bear', '{"Hulu"}', '{"Disney+"}', 'Un joven chef gourmet vuelve a Chicago para dirigir el restaurante familiar de bocadillos.'),
  (55350, 'Abbott Elementary', '{"ABC"}', '{}', 'Mockumentary sobre los profesores de un colegio público de Filadelfia.'),
  (32938, 'The Rookie', '{"ABC"}', '{}', 'Un hombre de 40 años empieza una nueva carrera como policía en Los Ángeles.'),
  (28152, '9-1-1', '{"ABC"}', '{}', 'Operadores y equipos de emergencia de Los Ángeles afrontan crisis cada día.'),
  (60, 'NCIS', '{"CBS"}', '{}', 'Agentes de la unidad de investigación criminal de la Marina de EE. UU. resuelven casos complejos.'),
  (46573, 'Ghosts', '{"CBS"}', '{}', 'Una pareja hereda una mansión habitada por fantasmas de distintas épocas.'),
  (59, 'Chicago Fire', '{"NBC"}', '{}', 'Bomberos y paramédicos de Chicago se enfrentan a emergencias cada día.'),
  (2246, 'Chicago Med', '{"NBC"}', '{}', 'El personal de urgencias del Chicago Med afronta casos médicos y personales complicados.'),
  (45840, 'Mayor of Kingstown', '{"Paramount+"}', '{}', 'El jefe de seguridad de una prisión de Michigan se enfrenta al poder y la corrupción local.'),
  (53777, 'Landman', '{"Paramount+"}', '{}', 'Un ejecutivo petrolero de Texas navega por los conflictos del negocio energético.'),
  (13, 'The Flash', '{"The CW"}', '{}', 'Barry Allen adquiere supervelocidad tras un accidente científico y protege Ciudad Central.'),
  (2243, 'Vis a Vis', '{}', '{"Movistar Plus+"}', 'Una joven empresaria acaba en una prisión de mujeres y aprende a sobrevivir entre rejas.'),
  (75026, 'MobLand', '{"Paramount+"}', '{}', 'https://static.tvmaze.com/uploads/images/medium_portrait/500/125000.jpg')
ON CONFLICT (tvmaze_id) DO NOTHING;

INSERT INTO catalog_sync (id, last_synced_at) VALUES (1, NULL) ON CONFLICT (id) DO NOTHING;
