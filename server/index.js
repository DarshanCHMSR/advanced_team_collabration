
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.use('/api/auth', require('./routes/auth'));
app.use('/api/projects', require('./routes/projects'));

app.get('/', (req, res) => {
  res.send('Advanced Team Collaboration Platform API');
});

app.listen(port, () => {
  console.log(`Server is running on port: ${port}`);
});
