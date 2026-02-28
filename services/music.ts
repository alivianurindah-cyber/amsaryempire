import { sql } from './db';
import { MusicTrack } from '../types';

export const getMusicTracks = async (): Promise<MusicTrack[]> => {
  try {
    const tracks = await sql`SELECT * FROM music_tracks ORDER BY created_at DESC`;
    if (!tracks || !Array.isArray(tracks) || tracks.length === 0) {
        return [];
    }
    return tracks.map((t: any) => ({
      id: t.id,
      title: t.title,
      artist: t.artist,
      url: t.url,
      lyrics: t.lyrics,
      createdAt: Number(t.created_at)
    }));
  } catch (e) {
    console.error("Failed to fetch music tracks from SQL:", e);
    return [];
  }
};

export const addMusicTrack = async (track: MusicTrack, _file?: File): Promise<MusicTrack> => {
  try {
    await sql`
      INSERT INTO music_tracks (id, title, artist, url, lyrics, created_at)
      VALUES (${track.id}, ${track.title}, ${track.artist}, ${track.url}, ${track.lyrics ?? null}, ${track.createdAt})
    `;
    return track;
  } catch (e) {
    console.error("Failed to save track to SQL:", e);
    throw new Error("Cloud connection required to upload music. Please check your database settings.");
  }
};

export const deleteMusicTrack = async (id: string): Promise<void> => {
  try {
    await sql`DELETE FROM music_tracks WHERE id = ${id}`;
  } catch (e) {
    console.error("Failed to delete track from SQL:", e);
    throw new Error("Cloud connection required to delete music. Please check your database settings.");
  }
};
