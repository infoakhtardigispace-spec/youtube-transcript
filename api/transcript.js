// api/transcript.js - Simplified version
export default async function handler(req, res) {
  // Allow requests from anywhere
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  
  // Handle preflight request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { videoId } = req.query;

  if (!videoId) {
    return res.status(400).json({ error: 'Video ID chahiye' });
  }

  try {
    console.log(`Fetching transcript for video: ${videoId}`);
    
    // Try multiple sources
    let transcript = null;
    
    // Source 1: YouTube Transcript API (most reliable)
    try {
      const response = await fetch(`https://youtubetranscript.com/?server_video_id=${videoId}`);
      if (response.ok) {
        transcript = await response.json();
        console.log('Got transcript from API 1');
      }
    } catch (e) {
      console.log('API 1 failed:', e.message);
    }
    
    // Source 2: Direct YouTube scraping (if API fails)
    if (!transcript || transcript.length === 0) {
      try {
        transcript = await fetchFromYouTube(videoId);
        console.log('Got transcript from YouTube direct');
      } catch (e) {
        console.log('YouTube direct failed:', e.message);
      }
    }
    
    if (transcript && transcript.length > 0) {
      return res.status(200).json(transcript);
    } else {
      return res.status(404).json({ error: 'Transcript nahi mila' });
    }
  } catch (error) {
    console.error('Server error:', error);
    return res.status(500).json({ error: 'Server error: ' + error.message });
  }
}

// Direct YouTube fetch function
async function fetchFromYouTube(videoId) {
  try {
    // Get video page
    const response = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    const html = await response.text();
    
    // Try to find captions in page
    const regex = /"captionTracks":\s*(\[.*?\])/;
    const match = html.match(regex);
    
    if (match) {
      const captionData = JSON.parse(match[1]);
      if (captionData && captionData[0] && captionData[0].baseUrl) {
        const captionsUrl = captionData[0].baseUrl;
        const captionsResponse = await fetch(captionsUrl);
        const captionsXml = await captionsResponse.text();
        
        // Parse XML
        return parseXmlTranscript(captionsXml);
      }
    }
    return null;
  } catch (e) {
    console.log('YouTube direct error:', e);
    return null;
  }
}

// Parse XML transcript
function parseXmlTranscript(xml) {
  const lines = [];
  const regex = /<text start="([\d.]+)" dur="([\d.]+)">(.*?)<\/text>/g;
  let match;
  
  while ((match = regex.exec(xml)) !== null) {
    lines.push({
      start: parseFloat(match[1]),
      duration: parseFloat(match[2]),
      text: match[3]
        .replace(/&amp;#39;/g, "'")
        .replace(/&amp;quot;/g, '"')
        .replace(/&amp;amp;/g, '&')
    });
  }
  
  return lines;
}
