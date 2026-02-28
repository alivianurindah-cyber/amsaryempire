import { sql, isTrulyOnline } from './db';
import { MusicTrack } from '../types';
import { addTrackToDB, getAllTracksFromDB, deleteTrackFromDB } from './indexedDB';

export const getMusicTracks = async (): Promise<MusicTrack[]> => {
  if (!isTrulyOnline()) {
    const tracks = await getAllTracksFromDB();
    return tracks.sort((a, b) => b.createdAt - a.createdAt);
  }
  try {
    const tracks = await sql`SELECT * FROM music_tracks ORDER BY created_at DESC`;
    if (!tracks || tracks.length === 0) {
        // If SQL returns nothing, maybe we should still check local for safety?
        // But for now let's assume SQL is source of truth when online
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
    console.error("Failed to fetch music tracks from SQL, falling back to local:", e);
    const tracks = await getAllTracksFromDB();
    return tracks.sort((a, b) => b.createdAt - a.createdAt);
  }
};

export const addMusicTrack = async (track: MusicTrack, file?: File): Promise<MusicTrack> => {
  if (!isTrulyOnline()) {
    await addTrackToDB(track, file);
    return track;
  }
  
  try {
    // For online mode, we still use the base64 URL if provided, or handle file upload differently if backend supports it
    // Assuming for now the backend expects base64 in the URL field as before
    await sql`
      INSERT INTO music_tracks (id, title, artist, url, lyrics, created_at)
      VALUES (${track.id}, ${track.title}, ${track.artist}, ${track.url}, ${track.lyrics ?? null}, ${track.createdAt})
    `;
    return track;
  } catch (e) {
    console.error("Failed to save track to SQL, saving to local instead:", e);
    await addTrackToDB(track, file);
    return track;
  }
};

export const deleteMusicTrack = async (id: string): Promise<void> => {
  if (!isTrulyOnline()) {
    await deleteTrackFromDB(id);
    return;
  }
  try {
    await sql`DELETE FROM music_tracks WHERE id = ${id}`;
  } catch (e) {
    console.error("Failed to delete track from SQL, deleting from local:", e);
    await deleteTrackFromDB(id);
  }
};
