// api/video-info.js
export default async function handler(req, res) {
    // Allow CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    const { videoId } = req.query;
    
    if (!videoId) {
        return res.status(400).json({ error: 'Video ID required' });
    }
    
    try {
        // Get video info from oEmbed
        const oembedRes = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`);
        const oembedData = await oembedRes.json();
        
        // Get duration (this requires additional API)
        const videoPageRes = await fetch(`https://www.youtube.com/watch?v=${videoId}`);
        const videoPageHtml = await videoPageRes.text();
        
        // Extract duration from page
        const durationMatch = videoPageHtml.match(/"approxDurationMs":"(\d+)"/);
        const duration = durationMatch ? Math.floor(parseInt(durationMatch[1]) / 1000) : 0;
        
        res.json({
            title: oembedData.title || 'YouTube Video',
            author: oembedData.author_name || 'Unknown',
            duration: duration,
            videoId: videoId
        });
    } catch (error) {
        console.error('Video info error:', error);
        res.json({
            title: 'YouTube Video',
            author: 'Unknown',
            duration: 0,
            videoId: videoId
        });
    }
}
