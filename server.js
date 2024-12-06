import express from 'express';


const app = express();

app.get('/', async (req, res) => {
  res.end("Hello");
});

app.listen(8080);