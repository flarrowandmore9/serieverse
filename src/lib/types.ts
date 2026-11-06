export type Character = {
  actor: string;
  character: string;
  image: string;
};

export type ShowListItem = {
  id: number;
  tvmaze_id: number | null;
  title: string;
  poster_url: string | null;
  synopsis_es: string | null;
  genres: string | null;
  tv_status: string | null;
  premiered: string | null;
  rating: number | null;
  is_miniseries: boolean;
  TMDB_id: string | null;
  network_name: string | null;
  us_platforms: string[];
  es_platforms: string[];
};

export type Show = ShowListItem & {
  synopsis_source: string | null;
  ended: string | null;
  runtime: number | null;
  characters: Character[] | null;
};

export type SpecialTag = 'crossover' | 'halloween' | 'christmas' | 'special' | null;

export type Episode = {
  tvmaze_episode_id: number;
  season: number;
  number: number;
  name: string | null;
  airdate: string;
  runtime: number | null;
  episode_type?: string | null;
  role_override?: EpisodeRole | null;
  special_tag?: SpecialTag;
};

export type EpisodeRole = 'series_premiere' | 'season_premiere' | 'season_finale' | 'mid_season_finale' | 'regular';

export type CalendarEpisode = Episode & {
  role: EpisodeRole;
  show: {
    id: number;
    title: string;
    poster_url: string | null;
    tv_status: string | null;
  };
};

export type Profile = {
  id: string;
  name: string;
  email: string;
  avatar_url: string | null;
  is_admin: boolean;
  created_at: string;
};

export type ListMembership = {
  id: number;
  folder: string;
};

export type ListEntry = ListMembership & {
  show: Pick<ShowListItem, 'id' | 'title' | 'poster_url' | 'tv_status' | 'us_platforms' | 'es_platforms'>;
};

export const SUGGESTION_STATUSES = ['Por hacer', 'Prioridad', 'En proceso', 'Completada'] as const;
export type SuggestionStatus = (typeof SUGGESTION_STATUSES)[number];

export type ViewId = 'catalog' | 'calendar' | 'platforms' | 'library' | 'suggestions' | 'account' | 'admin';

export type Suggestion = {
  id: number;
  name: string;
  email: string | null;
  message: string;
  status: SuggestionStatus;
  created_at: string;
};
