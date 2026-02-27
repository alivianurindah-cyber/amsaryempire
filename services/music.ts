import { sql, isOffline } from './db';
import { MusicTrack } from '../types';
import { addTrackToDB, getAllTracksFromDB, deleteTrackFromDB } from './indexedDB';

export const getMusicTracks = async (): Promise<MusicTrack[]> => {
  if (isOffline) {
    const tracks = await getAllTracksFromDB();
    return tracks.sort((a, b) => b.createdAt - a.createdAt);
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

export const addMusicTrack = async (track: MusicTrack, file?: File): Promise<MusicTrack> => {
  if (isOffline) {
    await addTrackToDB(track, file);
    return track;
  }
  
  // For online mode, we still use the base64 URL if provided, or handle file upload differently if backend supports it
  // Assuming for now the backend expects base64 in the URL field as before
  await sql`
    INSERT INTO music_tracks (id, title, artist, url, lyrics, created_at)
    VALUES (${track.id}, ${track.title}, ${track.artist}, ${track.url}, ${track.lyrics}, ${track.created_at || track.createdAt})
  `;
  return track;
};

export const deleteMusicTrack = async (id: string): Promise<void> => {
  if (isOffline) {
    await deleteTrackFromDB(id);
    return;
  }
  await sql`DELETE FROM music_tracks WHERE id = ${id}`;
};
