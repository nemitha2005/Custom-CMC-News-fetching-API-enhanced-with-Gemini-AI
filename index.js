const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const cors = require('cors');

const app = express();
app.use(cors());

const PORT = process.env.PORT || 3000;
const genAI = new GoogleGenerativeAI('AIzaSyAWyhF3pn2qecNFBZAvUepuvSsY-TPU5Po');
const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

async function enhanceTitle(title) {
  const prompt = `Enhance this title for a mobile app news feed. Keep it clear and full meaning. If it's in Sinhala, translate to English. Don't include any of other languages in this just proper english only. Original title: "${title}"`;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text().trim() || title;
  } catch (error) {
    console.error('Gemini API Error:', error.message);
    return title;
  }
}

async function scrapeNews() {
  try {
    const { data } = await axios.get("https://www.colombo.mc.gov.lk/news.php");
    const $ = cheerio.load(data);
    const elements = $('.row').get().slice(2, 12);

    const promises = elements.map(async (element) => {
      const title = $(element).find('h4').text().trim();
      const thumbnail = $(element).find('img').attr('src');
      const imageUrl = thumbnail ? `https://www.colombo.mc.gov.lk/${thumbnail}` : null;
      const readMoreLink = $(element).find('a').attr('href');
      const fullLink = readMoreLink ? `https://www.colombo.mc.gov.lk/${readMoreLink}` : null;

      if (title && fullLink) {
        const enhancedTitle = await enhanceTitle(title);
        return { title: enhancedTitle, thumbnail: imageUrl, readMoreLink: fullLink };
      }
      return null;
    });

    return (await Promise.all(promises)).filter(Boolean);
  } catch (error) {
    console.error('Scraping Error:', error.message);
    return [];
  }
}

app.get('/api/news', async (req, res) => {
  const news = await scrapeNews();
  res.json(news);
});

app.get('/', (req, res) => {
  res.send('News API Server Running');
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));