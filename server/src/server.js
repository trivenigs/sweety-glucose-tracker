const app = require('./app');
const { port } = require('./config/env');
app.listen(port, () => console.log(`Sweety API listening on port ${port}`));
