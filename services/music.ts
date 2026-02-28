import { sql } from './db';
import { MusicTrack } from '../types';

export const getMusicTracks = async (): Promise<MusicTrack[]> => {
  try {
    console.log("Fetching music tracks from SQL...");
    const tracks = await sql`SELECT id, title, artist, url, lyrics, created_at FROM music_tracks ORDER BY created_at DESC`;
    
    if (!tracks || !Array.isArray(tracks)) {
        console.warn("getMusicTracks: Received non-array response", tracks);
        return [];
    }
    
    console.log(`Successfully fetched ${tracks.length} tracks.`);
    return tracks.map((t: any) => ({
      id: t.id,
      title: t.title,
      artist: t.artist,
      url: t.url,
      lyrics: t.lyrics,
      createdAt: Number(t.created_at)
    }));
  } catch (e: any) {
    console.error("Failed to fetch music tracks from SQL:", e);
    // If table doesn't exist, we might get an error. Let's try to handle it.
    if (e.message?.includes('does not exist')) {
        console.log("music_tracks table does not exist yet.");
    }
    return [];
  }
};

export const addMusicTrack = async (track: MusicTrack, _file?: File): Promise<MusicTrack> => {
  try {
    console.log(`Adding music track: ${track.title} (${(track.url.length / 1024 / 1024).toFixed(2)} MB base64)`);
    
    await sql`
      INSERT INTO music_tracks (id, title, artist, url, lyrics, created_at)
      VALUES (${track.id}, ${track.title}, ${track.artist}, ${track.url}, ${track.lyrics ?? null}, ${track.createdAt})
    `;
    
    console.log(`Successfully added track: ${track.id}`);
    return track;
  } catch (e: any) {
    console.error("Failed to save track to SQL:", e);
    const msg = e.message || "";
    if (msg.includes('too large') || msg.includes('payload') || msg.includes('exceeds') || msg.includes('request entity too large')) {
        throw new Error("File too large for cloud storage. The combined size of the audio data exceeds database limits (10MB total request limit). Try a smaller file.");
    }
    throw new Error(msg || "Cloud connection required to upload music.");
  }
};

export const deleteMusicTrack = async (id: string): Promise<void> => {
  try {
    await sql`DELETE FROM music_tracks WHERE id = ${id}`;
  } catch (e: any) {
    console.error("Failed to delete track from SQL:", e);
    throw new Error("Cloud connection required to delete music. Please check your database settings.");
  }
};

export const updateMusicTrack = async (id: string, updates: Partial<MusicTrack>): Promise<void> => {
  try {
    const { title, artist, lyrics } = updates;
    await sql`
      UPDATE music_tracks 
      SET 
        title = COALESCE(${title ?? null}, title),
        artist = COALESCE(${artist ?? null}, artist),
        lyrics = COALESCE(${lyrics ?? null}, lyrics)
      WHERE id = ${id}
    `;
  } catch (e: any) {
    console.error("Failed to update track in SQL:", e);
    throw new Error("Cloud connection required to update music. Please check your database settings.");
  }
};
