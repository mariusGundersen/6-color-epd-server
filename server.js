import express from 'express';


const app = express();

app.get('/image', async (req, res) => {
  res.end("Hello");
});

app.listen(8080);