'use strict';
// model is connector specific, custom model is extending base model and is database specific
const DB = require('../..');
const jsonSchema = require('./json-schema');
const orm = require('./orm');

// Many methods in the MongoDB driver will return a promise
class Model extends DB {
    // connect() method is connector specific and is inherited through dynamic DB model
    constructor(connection) {
        super(connection);
        Object.assign(this, jsonSchema, { orm });
        this.p = Promise.resolve();
    }
    // direct access to the driver methods
    getClient = async () => this.client || (await this.connect().then((result) => result.client));
    getDb = (db) => this.getClient().then((client) => client.db(db));
    getAdmin = () => this.getDb().then((db) => db.admin());
    getController = (controller, db) => this.getDb(db).then((db) => db.collection(controller));
    select = (table, fromDb) => this.getDb(fromDb).then((db) => db.collection(table)); // alias
    // interface methods to the driver
    exec(...args) {
        return this._chain(this._exec, ...args);
    }
    _exec(fn, ...args) {
        this[fn].apply(this, args);
    }
    returnArg(...args) {
        return this._chain(this._returnArg, ...args);
    }
    _returnArg(...args) {
        return args[0];
    }
    returnArgs(...args) {
        return this._chain(this._returnArgs, ...args);
    }
    _returnArgs(...args) {
        return args;
    }
    restClient(...args) {
        return this._chain(this._init, ...args);
    }
    async _init(connection) {
        if (!this.isConnected || connection) {
            if (connection) this.connection = connection;
            Object.assign(this, await this.connect());
            this.isConnected = true;
        }
    }
    db(...args) {
        return this._chain(this._initDb, ...args);
    }
    async _initDb(db, connection) {
        if (!this.isDbConnected || db) {
            if (db) this.connection.database = db;
            await this._init(connection);
            this._db = this.client.db(this.connection.database);
            this.isDbConnected = true;
        }
    }
    admin(...args) {
        return this._chain(this._initAdmin, ...args);
    }
    async _initAdmin(db, connection) {
        if (!this.isAdminConnected || connection || db) {
            await this._init(connection);
            await this._initDb(db);
            this._db._admin = this._db.admin();
            this.isAdminConnected = true;
        }
    }
    controller(...args) {
        return this._chain(this._initController, ...args);
    }
    async _initController(controller, db, connection) {
        if (!this.isControllerConnected || controller) {
            if (controller) this.connection.controller = controller;
            await this._init(connection);
            await this._initDb(db);
            this._db._collection = this._db.collection(this.connection.controller);
            this.isControllerConnected = true;
        }
    }
    // not in the restApi
    debug(...args) {
        return this._chain(this._debug, ...args);
    }
    async _debug() {
        console.dir(this, { depth: false });
    }
    async close() {
        await this.client.close();
    }
    // not in the restApi
    command(...args) {
        return this._chain(this._command, ...args);
    }
    async _command(command, options) {
        if (!this.isDbConnected) await this._initDb();
        return await this._db.command({ ...command }, { ...options });
    }
    // not in the restApi
    listDatabases(...args) {
        return this._chain(this._listDatabases, ...args);
    }
    async _listDatabases(listDatabasesOptions) {
        if (!this.isAdminConnected) await this._initAdmin();
        return await this._db._admin.listDatabases({ ...listDatabasesOptions });
    }
    async listAuthorizedDatabases() {
        return await this.listDatabases({ nameOnly: true, authorizedDatabases: true }).then((obj) => [].concat(obj.databases.map((item) => item.name)));
    }
    dropDatabase(...args) {
        return this._chain(this._dropDatabase, ...args);
    }
    async _dropDatabase(commandOperationOptions) {
        if (!this.isDbConnected) await this._initDb();
        return await this._db.dropDatabase({ ...commandOperationOptions });
    }
    addAdmin(...args) {
        return this._chain(this._addAdmin, ...args);
    }
    async _addAdmin(username, password, addUserOptions) {
        if (!this.isAdminConnected) await this._initAdmin();
        return await this._db._admin.addUser(username, password, { ...addUserOptions });
    }
    removeAdmin(...args) {
        return this._chain(this._removeAdmin, ...args);
    }
    async _removeAdmin(username, commandOperationOptions) {
        if (!this.isAdminConnected) await this._initAdmin();
        return await this._db._admin.removeUser(username, { ...commandOperationOptions });
    }
    addUser(...args) {
        return this._chain(this._addUser, ...args);
    }
    async _addUser(username, password, addUserOptions) {
        if (!this.isDbConnected) await this._initDb();
        return await this._db.addUser(username, password, { ...addUserOptions });
    }
    removeUser(...args) {
        return this._chain(this._removeUser, ...args);
    }
    async _removeUser(username, commandOperationOptions) {
        if (!this.isDbConnected) await this._initDb();
        return await this._db.removeUser(username, { ...commandOperationOptions });
    }
    // not in the restApi
    listControllers(...args) {
        return this._chain(this._listControllers, ...args);
    }
    async _listControllers(filter, listCollectionsOptions) {
        if (!this.isDbConnected) await this._initDb();
        return await this._db.listCollections({ ...filter }, { ...listCollectionsOptions }).toArray();
    }
    async listAuthorizedControllers() {
        return await this.listControllers({}, { nameOnly: true, authorizedCollections: true }).then((col) => [].concat(col.map((item) => item.name)));
    }
    createController(...args) {
        return this._chain(this._createController, ...args);
    }
    async _createController(name, createCollectionOptions) {
        if (!this.isDbConnected) await this._initDb();
        return await this._db.createCollection(name, { ...createCollectionOptions });
    }
    setControllerOptions(...args) {
        return this._chain(this._setControllerOptions, ...args);
    }
    async _setControllerOptions(collectionOptions, commandOptions) {
        return await this._command({ collMod: this.connection.controller, ...collectionOptions }, { ...commandOptions });
    }
    renameController(...args) {
        return this._chain(this._renameController, ...args);
    }
    async _renameController(fromCollection, toCollection, renameOptions) {
        if (!this.isDbConnected) await this._initDb();
        return await this._db.renameCollection(fromCollection, toCollection, { ...renameOptions });
    }
    dropController(...args) {
        return this._chain(this._dropController, ...args);
    }
    async _dropController(collectionName, commandOperationOptions) {
        if (!this.isDbConnected) await this._initDb();
        return await this._db.dropCollection(collectionName, { ...commandOperationOptions });
    }
    listIndexes(...args) {
        return this._chain(this._listIndexes, ...args);
    }
    async _listIndexes() {
        if (!this.isControllerConnected) await this._initController();
        return await this._db._collection.listIndexes().toArray();
    }
    createIndex(...args) {
        return this._chain(this._createIndex, ...args);
    }
    async _createIndex(indexSpecification, createIndexesOptions) {
        if (!this.isControllerConnected) await this._initController();
        return await this._db._collection.createIndex([...indexSpecification], { ...createIndexesOptions });
    }
    dropIndex(...args) {
        return this._chain(this._dropIndex, ...args);
    }
    async _dropIndex(index) {
        if (!this.isControllerConnected) await this._initController();
        return await this._db._collection.dropIndex(index);
    }
    async getValidation() {
        return await this.listControllers({ name: this.connection.controller }).then((c) => this.orm.validation(c[0].options));
    }
    async setValidation(validation, commandOptions) {
        return await this.setControllerOptions({ ...validation }, { ...commandOptions });
    }
    async info() {
        return await this.listControllers({ name: this.connection.controller }).then((c) => c[0].info);
    }
    count(...args) {
        return this._chain(this._countDocuments, ...args);
    }
    async _countDocuments(filter, countDocumentsOptions) {
        if (!this.isControllerConnected) await this._initController();
        return { matchedCount: await this._db._collection.countDocuments({ ...filter }, { ...countDocumentsOptions }) };
    }
    distinct(...args) {
        return this._chain(this._distinct, ...args);
    }
    async _distinct(key, filter, commandOperationOptions) {
        if (!this.isControllerConnected) await this._initController();
        return await this._db._collection.distinct(key, { ...filter }, { ...commandOperationOptions });
    }
    aggregate(...args) {
        return this._chain(this._aggregate, ...args);
    }
    async _aggregate(pipeline, aggregateOptions) {
        if (!this.isControllerConnected) await this._initController();
        return await this._db._collection.aggregate([...pipeline], { ...aggregateOptions }).toArray();
    }
    // not in the restApi
    bulkWrite(...args) {
        return this._chain(this._bulkWrite, ...args);
    }
    async _bulkWrite(operations, bulkWriteOptions) {
        if (!this.isControllerConnected) await this._initController();
        return await this._db._collection.bulkWrite([...operations], { ...bulkWriteOptions });
    }
    // not in the restApi
    watch(...args) {
        return this._chain(this._watch, ...args);
    }
    async _watch(pipeline, changeStreamOptions) {
        if (!this.isControllerConnected) await this._initController();
        return await this._db._collection.watch([...pipeline], { ...changeStreamOptions });
    }
    findOne(...args) {
        return this._chain(this._findOne, ...args);
    }
    async _findOne(filter, options) {
        if (!this.isControllerConnected) await this._initController();
        return await this._db._collection.findOne({ ...filter }, { ...options });
    }
    findMany(...args) {
        return this._chain(this._findMany, ...args);
    }
    async _findMany(filter, options) {
        if (!this.isControllerConnected) await this._initController();
        return await this._db._collection.find({ ...filter }, { ...options }).toArray();
    }
    find(...args) {
        return this._chain(this._find, ...args);
    }
    async _find(filter, options) {
        if (!this.isControllerConnected) await this._initController();
        return await this._db._collection.find({ ...filter }, { ...options });
    }
    insertOne(...args) {
        return this._chain(this._insertOne, ...args);
    }
    async _insertOne(document, options) {
        if (!this.isControllerConnected) await this._initController();
        return await this._db._collection.insertOne({ ...document }, { ...options });
    }
    insertMany(...args) {
        return this._chain(this._insertMany, ...args);
    }
    async _insertMany(documents, options) {
        if (!this.isControllerConnected) await this._initController();
        return await this._db._collection.insertMany([...documents], { ...options });
    }
    updateOne(...args) {
        return this._chain(this._updateOne, ...args);
    }
    async _updateOne(filter, update, options) {
        if (options) delete options.upsert;
        if (!this.isControllerConnected) await this._initController();
        return await this._db._collection.updateOne({ ...filter }, { $set: { ...update } }, { ...options });
    }
    updateMany(...args) {
        return this._chain(this._updateMany, ...args);
    }
    async _updateMany(filter, update, options) {
        if (options) delete options.upsert;
        if (!this.isControllerConnected) await this._initController();
        return await this._db._collection.updateMany({ ...filter }, { $set: { ...update } }, { ...options });
    }
    upsertOne(...args) {
        return this._chain(this._upsertOne, ...args);
    }
    async _upsertOne(filter, update, options) {
        if (options) delete options.upsert;
        if (!this.isControllerConnected) await this._initController();
        return await this._db._collection.updateOne({ ...filter }, { $set: { ...update } }, { upsert: true, ...options });
    }
    async upsertMany(operations) {
        const operation = (args) => ({ updateMany: { filter: args[0], update: { $set: args[1] }, upsert: true } });
        for (let i = 0; i < operations.length; i++) {
            operations[i] = operation(operations[i]);
        }
        return await this.bulkWrite(operations);
    }
    deleteOne(...args) {
        return this._chain(this._deleteOne, ...args);
    }
    async _deleteOne(filter, options) {
        if (!this.isControllerConnected) await this._initController();
        return await this._db._collection.deleteOne({ ...filter }, { ...options });
    }
    deleteMany(...args) {
        return this._chain(this._deleteMany, ...args);
    }
    async _deleteMany(filter, options) {
        if (!this.isControllerConnected) await this._initController();
        return await this._db._collection.deleteMany({ ...filter }, { ...options });
    }
    _chain(fn, ...args) {
        this.p = this.p.then(() => fn.apply(this, args));
        return this;
    }
    then(a, b) {
        this.p = this.p.then(a, b);
        return this;
    }
    catch(fn) {
        this.p = this.p.catch(fn);
        return this;
    }
}

module.exports = Model;
