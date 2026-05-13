const mongoose = require('mongoose');
const Route = require('./models/Route');

mongoose.connect('mongodb://127.0.0.1:27017/transport_system', {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(async () => {
  const routes = await Route.find({});
  for (let r of routes) {
    if (r.routeName.includes(' (NEW)')) {
      r.routeName = r.routeName.replace(' (NEW)', '');
      await r.save();
    }
  }
  console.log('Routes updated');
  process.exit(0);
});
