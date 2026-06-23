const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

const datasPath = path.join(__dirname, '../datas.json');
const datas = require(datasPath);

const characterMap = {
  "jon snow": "jon", "eddard stark": "ned", "ned stark": "ned", "ned": "ned",
  "cersei lannister": "cersei", "cersei": "cersei", "daenerys targaryen": "daenerys", 
  "daenerys": "daenerys", "tyrion lannister": "tyrion", "tyrion": "tyrion", 
  "jaime lannister": "jaime", "jaime": "jaime", "arya stark": "arya", "arya": "arya",
  "sansa stark": "sansa", "sansa": "sansa", "tywin lannister": "tywin", "tywin": "tywin",
  "catelyn stark": "catelyn", "catelyn": "catelyn", "robb stark": "robb", "robb": "robb",
  "robert baratheon": "robert", "robert": "robert", "joffrey baratheon": "joffrey", 
  "joffrey": "joffrey", "petyr baelish": "baelish", "littlefinger": "baelish", 
  "baelish": "baelish", "varys": "varys", "sandor clegane": "sandor", "the hound": "sandor",
  "sandor": "sandor", "samwell tarly": "samwell", "sam": "samwell", "samwell": "samwell",
  "bran stark": "bran", "bran": "bran", "brienne of tarth": "brienne", "brienne": "brienne",
  "davos seaworth": "davos", "davos": "davos", "melisandre": "melisandre", 
  "mance rayder": "mance", "mance": "mance", "theon greyjoy": "theon", "theon": "theon",
  "ramsay bolton": "ramsay", "ramsay snow": "ramsay", "ramsay": "ramsay",
  "tormund giantsbane": "tormund", "tormund": "tormund", "olenna tyrell": "olenna", 
  "olenna": "olenna", "oberyn martell": "oberyn", "oberyn": "oberyn", 
  "walder frey": "walder", "walder": "walder", "ygritte": "ygritte", "qyburn": "qyburn",
  "lyanna mormont": "lyanna", "lyanna stark": "lyanna", "lyanna": "lyanna",
  "aemon": "aemon", "maester aemon": "aemon", "aerys targaryen": "aerys", "aerys": "aerys",
  "gared": "gared", "hodor": "hodor", "jaqen h'ghar": "jaqen", "jaqen": "jaqen",
  "daario naharis": "daario", "daario": "daario", "jeor mormont": "joer", "joer": "joer"
};

const getCharacterSlug = (name) => {
  if (!name) return null;
  const cleanName = name.replace(/:/g, '').trim().toLowerCase();
  for (const [key, slug] of Object.entries(characterMap)) {
    if (cleanName.includes(key)) return slug;
  }
  return null;
};

const scrapeSeason = async (seasonNum) => {
  console.log(`Scraping Season ${seasonNum}...`);
  const url = `https://en.wikiquote.org/wiki/Game_of_Thrones/Season_${seasonNum}`;
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
      }
    });
    const $ = cheerio.load(response.data);
    const quotes = [];

    // In wikiquote, dialogue is usually in <dl><dd>
    $('dl > dd, ul > li').each((i, el) => {
      const bTag = $(el).find('b').first();
      if (bTag.length > 0) {
        const speaker = bTag.text().trim().replace(/:$/, '');
        let sentence = $(el).text().replace(bTag.text(), '').replace(/^[:\-]/, '').trim();
        
        if (speaker && sentence && sentence.length > 5) {
          const slug = getCharacterSlug(speaker);
          if (slug) {
            // Remove bracketed text like [pauses]
            const cleanSentence = sentence.replace(/\[.*?\]/g, '').trim();
            // Avoid Wikipedia citations like [1]
            const finalSentence = cleanSentence.replace(/\[\d+\]/g, '').trim();
            if (finalSentence) {
              quotes.push({
                character: slug,
                sentence: finalSentence,
                season: seasonNum
              });
            }
          }
        }
      }
    });



    return quotes;
  } catch (err) {
    console.error(`Failed to scrape Season ${seasonNum}:`, err.message);
    return [];
  }
};

const run = async () => {
  let newQuotesFound = 0;
  
  // Set existing quotes to season: null if not present
  datas.quotes = datas.quotes.map(q => ({
    ...q,
    season: q.season || null
  }));

  const existingSentences = new Set(datas.quotes.map(q => q.sentence.toLowerCase().trim()));

  for (let i = 1; i <= 8; i++) {
    const scrapedQuotes = await scrapeSeason(i);
    console.log(`Found ${scrapedQuotes.length} candidate quotes for Season ${i}`);
    
    scrapedQuotes.forEach(sq => {
      const clean = sq.sentence.toLowerCase().trim();
      // Only add if we don't have it already
      if (!existingSentences.has(clean)) {
        datas.quotes.push(sq);
        existingSentences.add(clean);
        newQuotesFound++;
      }
    });
  }

  fs.writeFileSync(datasPath, JSON.stringify(datas, null, 2));
  console.log(`\nSuccess! Added ${newQuotesFound} new quotes across 8 seasons.`);
  console.log(`Total quotes in datas.json is now ${datas.quotes.length}`);
};

run();
