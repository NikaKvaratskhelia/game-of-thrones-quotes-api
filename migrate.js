require('dotenv').config();
const mongoose = require('mongoose');
const datas = require('./datas.json');
const House = require('./models/House');
const Character = require('./models/Character');
const Quote = require('./models/Quote');

const connectDB = require('./config/db');

const migrateData = async () => {
  try {
    await connectDB();

    console.log('Clearing old data from the database...');
    await House.deleteMany();
    await Character.deleteMany();
    await Quote.deleteMany();

    console.log('Migrating Houses...');
    const housePromises = Object.keys(datas.houses).map(slug => {
      return House.create({
        _id: slug,
        name: datas.houses[slug].name,
        photo: datas.houses[slug].photo
      });
    });
    await Promise.all(housePromises);

    console.log('Migrating Characters...');
    const characterPromises = Object.keys(datas.characters).map(slug => {
      return Character.create({
        _id: slug,
        name: datas.characters[slug].name,
        house: datas.characters[slug].house || null,
        photo: datas.characters[slug].photo
      });
    });
    await Promise.all(characterPromises);

    console.log('Migrating Quotes...');
    const quotePromises = datas.quotes.map(quote => {
      return Quote.create({
        sentence: quote.sentence,
        character: quote.character,
        season: quote.season || null
      });
    });
    await Promise.all(quotePromises);

    console.log('✅ Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
};

migrateData();
