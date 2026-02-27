import { sql, isOffline } from './db';
import { MusicTrack } from '../types';
import { safeJSONParse } from '../src/utils/json';

export const getMusicTracks = async (): Promise<MusicTrack[]> => {
  if (isOffline) {
    return safeJSONParse(localStorage.getItem('music_tracks'), []);
  }
  try {
    const tracks = await sql`SELECT * FROM music_tracks ORDER BY created_at DESC`;
    return tracks.map((t: any) => ({
      id: t.id,
      title: t.title,
      artist: t.artist,
      url: t.url,
      lyrics: t.lyrics,
      createdAt: Number(t.created_at)
    }));
  } catch (e) {
    console.error("Failed to fetch music tracks:", e);
    return [];
  }
};

export const addMusicTrack = async (track: MusicTrack): Promise<MusicTrack> => {
  if (isOffline) {
    const tracks = safeJSONParse(localStorage.getItem('music_tracks'), []);
    tracks.unshift(track);
    localStorage.setItem('music_tracks', JSON.stringify(tracks));
    return track;
  }
  
  await sql`
    INSERT INTO music_tracks (id, title, artist, url, lyrics, created_at)
    VALUES (${track.id}, ${track.title}, ${track.artist}, ${track.url}, ${track.lyrics}, ${track.created_at || track.createdAt})
  `;
  return track;
};

export const deleteMusicTrack = async (id: string): Promise<void> => {
  if (isOffline) {
    const tracks = safeJSONParse(localStorage.getItem('music_tracks'), []);
    const newTracks = tracks.filter((t: MusicTrack) => t.id !== id);
    localStorage.setItem('music_tracks', JSON.stringify(newTracks));
    return;
  }
  await sql`DELETE FROM music_tracks WHERE id = ${id}`;
};
