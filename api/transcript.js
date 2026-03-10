// api/transcript.js
export default async function handler(req, res) {
  // Allow requests from any website (CORS header)
  res.setHeader('Access-Control-Allow-Origin', '*');

  const { videoId } = req.query;

  if (!videoId) {
    return res.status(400).json({ error: 'Video ID chahiye' });
  }

  try {
    // 1. Pehle try karo: YouTube ka internal API
    let transcript = await fetchFromYouTubeAPI(videoId);

    // 2. Agar na mile to try karo doosra API
    if (!transcript) {
      transcript = await fetchFromTranscriptAPI(videoId);
    }

    if (transcript && transcript.length > 0) {
      return res.status(200).json(transcript);
    } else {
      return res.status(404).json({ error: 'Transcript nahi mila' });
    }
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: 'Server error: ' + error.message });
  }
}

// Method 1: YouTube ka internal hidden API
async function fetchFromYouTubeAPI(videoId) {
  try {
    // Pehle video ka page fetch karo
    const response = await fetch(`https://www.youtube.com/watch?v=${videoId}`);
    const html = await response.text();

    // HTML mein se captions track ka URL nikaalo
    const regex = /"captionTracks":\[(.*?)\]/;
    const match = html.match(regex);

    if (match) {
      const captionData = JSON.parse(`[${match[1]}]`)[0];
      const baseUrl = captionData.baseUrl;

      // Ab captions fetch karo
      const captionsResponse = await fetch(baseUrl);
      const captionsXml = await captionsResponse.text();

      // XML ko parse karo aur transcript banayo
      return parseXmlToTranscript(captionsXml);
    }
    return null;
  } catch (e) {
    console.log('YouTube API failed:', e);
    return null;
  }
}

// Method 2: Public Transcript API (fallback)
async function fetchFromTranscriptAPI(videoId) {
  try {
    const response = await fetch(`https://youtubetranscript.com/?server_video_id=${videoId}`);
    if (response.ok) {
      return await response.json();
    }
    return null;
  } catch (e) {
    return null;
  }
}

// XML parser function
function parseXmlToTranscript(xmlText) {
  const lines = [];
  const regex = /<text start="([\d.]+)" dur="([\d.]+)">(.*?)<\/text>/g;
  let match;

  while ((match = regex.exec(xmlText)) !== null) {
    lines.push({
      start: parseFloat(match[1]),
      duration: parseFloat(match[2]),
      text: match[3].replace(/&amp;#39;/g, "'").replace(/&amp;quot;/g, '"')
    });
  }

  return lines;
}
