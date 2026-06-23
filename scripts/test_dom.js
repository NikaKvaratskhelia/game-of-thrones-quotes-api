const axios = require('axios');
const cheerio = require('cheerio');

axios.get('https://en.wikiquote.org/wiki/Game_of_Thrones/Season_1', {headers: {'User-Agent': 'Mozilla/5.0'}})
  .then(res => {
    const $ = cheerio.load(res.data);
    console.log($('.mw-parser-output').html().substring(0, 3000));
  });
