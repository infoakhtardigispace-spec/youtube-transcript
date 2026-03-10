// api/transcribe.js
import { exec } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';

export default async function handler(req, res) {
    // Allow CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    
    const { videoId, url } = req.body;
    
    if (!videoId || !url) {
        return res.status(400).json({ error: 'Video ID and URL required' });
    }
    
    // Create temp directory
    const tempDir = path.join(os.tmpdir(), `youtube-${videoId}`);
    await fs.mkdir(tempDir, { recursive: true });
    
    const audioPath = path.join(tempDir, 'audio.mp3');
    
    try {
        // Download audio using yt-dlp
        await execPromise(`yt-dlp -f bestaudio --extract-audio --audio-format mp3 -o "${audioPath}" "${url}"`);
        
        // Use YouTube Transcript API first (if available)
        try {
            const transcriptRes = await fetch(`https://youtubetranscript.com/?server_video_id=${videoId}`);
            if (transcriptRes.ok) {
                const transcript = await transcriptRes.json();
                if (transcript && transcript.length > 0) {
                    // Clean up
                    await fs.rm(tempDir, { recursive: true, force: true });
                    return res.json(transcript);
                }
            }
        } catch (e) {
            console.log('YouTube API failed, using Whisper');
        }
        
        // If no transcript, use Whisper (mock for demo - in production would use actual Whisper)
        // Note: Vercel doesn't support Whisper natively, this is a simplified version
        // For production, consider using a dedicated service or API
        
        // Mock transcript for demo (replace with actual Whisper API call)
        const mockTranscript = generateMockTranscript();
        
        // Clean up
        await fs.rm(tempDir, { recursive: true, force: true });
        
        res.json(mockTranscript);
        
    } catch (error) {
        console.error('Transcription error:', error);
        
        // Clean up on error
        try {
            await fs.rm(tempDir, { recursive: true, force: true });
        } catch (e) {}
        
        res.status(500).json({ error: error.message });
    }
}

function execPromise(command) {
    return new Promise((resolve, reject) => {
        exec(command, (error, stdout, stderr) => {
            if (error) {
                reject(error);
            } else {
                resolve(stdout);
            }
        });
    });
}

function generateMockTranscript() {
    // This is a mock - in production, you'd call Whisper API
    const segments = [
        "Welcome to this video tutorial!",
        "Today we're going to learn something amazing.",
        "First, let me show you the basics.",
        "This is how you get started with this technology.",
        "Now we move on to more advanced features.",
        "Here's a pro tip that will save you time.",
        "Let me demonstrate with an example.",
        "See how easy it is to use?",
        "Now you can apply this to your own projects.",
        "Thanks for watching, don't forget to subscribe!"
    ];
    
    return segments.map((text, index) => ({
        start: index * 30,
        duration: 30,
        text: text
    }));
}
