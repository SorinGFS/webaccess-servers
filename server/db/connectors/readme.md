[Back to Main Page](https://github.com/SorinGFS/webaccess#configuration)

### Database Connectors

This module is used by the `connections` module to form connections depending on the requested database. Each database can be configured to use a single specific connector.

Selecting the specific connector for the requested database is done dynamically, **do not modify the `index.js` file!**

Initially the application contains the mongodb connector based on the [native mongodb driver](https://github.com/mongodb/node-mongodb-native), to add a new connector create a specific file for that connector.