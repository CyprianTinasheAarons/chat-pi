const axios = require('axios');
const fs = require('fs');
const path = require('path');

const CHUNK_SIZE = 1024;
const url =
  'https://api.elevenlabs.io/v1/text-to-speech/GyXKLdSk9ixiwbpafwHE/stream';
const headers = {
  Accept: 'audio/mpeg',
  'Content-Type': 'application/json',
  'xi-api-key': process.env.ELEVENLABS_API_KEY,
};


const createAudio = async (req, res) => {
    const data = {
      text: req.body.text,
      voice_settings: {
        stability: 0,
        similarity_boost: 0,
      },
    };
  try {
    const response = await axios.post(url, JSON.stringify(data), {
      headers: headers,
      responseType: 'stream',
    });
   //save file in public folder
    const writer = fs.createWriteStream(
      path.join(process.cwd(), 'public', 'output.mp3')
    );

    response.data.pipe(writer);

    writer.on('finish', () => {
      res.send('File saved successfully!');
    });

    writer.on('error', (error) => {
      res.status(500).send('Error occurred while saving file');
    });
  } catch (error) {
    console.error(error);
    res.status(500).send('Error occurred while fetching speech data');
  }
};


const handler =  async (req, res) => {
    await createAudio(req, res);
};

export default handler;