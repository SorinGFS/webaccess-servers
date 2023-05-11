'use strict';
// https://docs.mongodb.com/realm/functions/json-and-bson/#ejson--extended-json-
// An easier working method for passing json data to db would be to get the bson validation schema in frontend, to serialize
// the data there based on validation schema and here just to replace the given expressions with bson types. But that method
// would be error prone and an extra convern for the webmaster.
const fn = require('zerodep/node/fn');
const { ObjectId, Int32, Long, Double, Decimal128, BSONRegExp, Code, Binary } = require('mongodb');

const topLevelKeys = ['$and', '$or', '$nor'];
const isTopLevelKey = (key) => (topLevelKeys.includes(key) ? true : false);

// const allowedTypeConversionAggregateStages = ['$facet', '$match', '$set'];
const deniedTypeConversionAggregateStages = ['$addFields', '$bucket', '$bucketAuto', '$collStats', '$count', '$currentOp', '$geoNear', '$graphLookup', '$group', '$indexStats', '$limit', '$listLocalSessions', '$listSessions', '$lookup', '$merge', '$out', '$planCacheStats', '$project', '$redact', '$replaceRoot', '$replaceWith', '$sample', '$search', '$setWindowFields', '$skip', '$sort', '$sortByCount', '$unionWith', '$unset', '$unwind'];
const deniedTypeConversionMidLevelKeys = [].concat(deniedTypeConversionAggregateStages);
const isDeniedTypeConversionMidLevelKey = (key) => (key.charAt(0) === '$' && deniedTypeConversionMidLevelKeys.includes(key) ? true : false);

const allowedTypeConversionLowLevelKeys = ['$eq', '$ne', '$gt', '$gte', '$lt', '$lte'];
const isAllowedTypeConversionLowLevelKey = (key) => (allowedTypeConversionLowLevelKeys.includes(key) ? true : false);

const jsonToBson = (value, bsonType) => {
    if (bsonType === 'object') return value;
    if (bsonType === 'array') return value;
    if (bsonType === 'null') return value && value.toLowerCase() === 'null' ? null : value;
    if (bsonType === 'bool') return Boolean(value);
    if (bsonType === 'string') return String(value);
    if (bsonType === 'regex') return BSONRegExp(value.$regularExpression.pattern, value.$regularExpression.options);
    if (bsonType === 'objectId') return new ObjectId(value);
    if (bsonType === 'int') return new Int32(value);
    if (bsonType === 'long') return new Long(String(value));
    if (bsonType === 'double') return new Double(value);
    if (bsonType === 'decimal') return new Decimal128(String(value));
    if (bsonType === 'date') return new Date(value);
    if (bsonType === 'binData') return new Binary(value);
    if (bsonType === 'javascript') return new Code(value);
    return value;
};

const bsonToJson = (value, jsonSchemaType) => {
    if (jsonSchemaType === 'object') return value;
    if (jsonSchemaType === 'array') return value;
    if (jsonSchemaType === 'null') return value && value.toLowerCase() === 'null' ? null : value;
    if (jsonSchemaType === 'boolean') return Boolean(value);
    if (jsonSchemaType === 'string') return String(value);
    if (jsonSchemaType === 'integer') return Number(value);
    if (jsonSchemaType === 'number') return Number(value);
    return value;
};

// return format is for use with replaceDeep
const bsonSchemaToJsonSchema = (bsonType, jsonTypeName) => {
    const jsonSchemaType = jsonTypeName || 'type';
    if (bsonType === 'object') return [{ [jsonSchemaType]: 'object' }];
    if (bsonType === 'array') return [{ [jsonSchemaType]: 'array' }];
    if (bsonType === 'null') return [{ [jsonSchemaType]: 'null' }];
    if (bsonType === 'bool') return [{ [jsonSchemaType]: 'boolean' }];
    if (bsonType === 'string') return [{ [jsonSchemaType]: 'string' }];
    if (bsonType === 'regex') return [{ [jsonSchemaType]: 'string' }];
    if (bsonType === 'objectId') return [{ [jsonSchemaType]: 'string' }];
    if (bsonType === 'int') return [{ [jsonSchemaType]: 'integer' }];
    if (bsonType === 'long') return [{ [jsonSchemaType]: 'integer' }];
    if (bsonType === 'double') return [{ [jsonSchemaType]: 'number' }];
    if (bsonType === 'decimal') return [{ [jsonSchemaType]: 'number' }];
    if (bsonType === 'date') return [{ [jsonSchemaType]: 'string' }];
    if (bsonType === 'binData') return [{ [jsonSchemaType]: 'string' }];
    if (bsonType === 'javascript') return [{ [jsonSchemaType]: 'string' }];
    return [bsonType];
};

// return format is for use with replaceDeep
const jsonSchemaToBsonSchema = (jsonSchemaType, bsonTypeName) => {
    const bsonType = bsonTypeName || 'bsonType';
    if (jsonSchemaType === 'object') return [{ [bsonType]: 'object' }];
    if (jsonSchemaType === 'array') return [{ [bsonType]: 'array' }];
    if (jsonSchemaType === 'null') return [{ [bsonType]: 'null' }];
    if (jsonSchemaType === 'boolean') return [{ [bsonType]: 'bool' }];
    if (jsonSchemaType === 'string') return [{ [bsonType]: 'string' }];
    if (jsonSchemaType === 'integer') return [{ [bsonType]: 'long' }];
    if (jsonSchemaType === 'number') return [{ [bsonType]: 'double' }];
    return [jsonSchemaType];
};

//  should return a schema or undefined (moved here from zerodep for refactoring of this file and related functions)
const getKeySchema = (data, key, schema) => {
    if (!key || typeof key !== 'string' || typeof schema !== 'object') return undefined;
    if (key.indexOf('.') !== -1) return getDotNotationKeySchema(key, schema);
    if (!Array.isArray(data)) {
        if (schema.properties && schema.properties[key]) {
            return schema.properties[key];
        } else {
            return undefined;
        }
    } else {
        if (schema.items) {
            return schema.items;
        } else {
            return undefined;
        }
    }
};

// should return a schema or undefined
const getDotNotationKeySchema = (key, schema) => {
    if (!key || typeof key !== 'string' || typeof schema !== 'object') return undefined;
    return key.split('.').reduce((matchingSchema, key) => {
        if (matchingSchema) {
            if (!this.isNumeric(key)) {
                if (matchingSchema.properties && matchingSchema.properties[key]) {
                    return matchingSchema.properties[key];
                } else {
                    return undefined;
                }
            } else {
                if (matchingSchema.items) {
                    return matchingSchema.items;
                } else {
                    return undefined;
                }
            }
        }
    }, schema);
};

// keys may be normal keys, numeric keys, dot notation keys, operators (top, mid, or low level)
// the goal is to reach to the value only for appliable cases
const parseDeepSchema = (schema, parser, data) => {
    if (data && schema && typeof data === 'object') {
        // the important thing is that parent is object, parsed key must be a value having a schema
        Object.keys(data).forEach((key) => {
            if (isTopLevelKey(key)) {
                // each element inside these keys corresponds to the whole schema
                for (let i = 0; i < data[key].length; i++) {
                    parseDeepSchema(schema, parser, data[key][i]);
                }
            } else if (typeof data[key] === 'object') {
                if (getKeySchema(data, key, schema)) {
                    if (!Array.isArray(data)) {
                        parseDeepSchema(getKeySchema(data, key, schema), parser, data[key]);
                    } else {
                        parseDeepSchema(schema, parser, data[key]);
                    }
                } else if (!isDeniedTypeConversionMidLevelKey(key)) {
                    // short circuiting mid level variable keys by passing the given schema to lower level
                    // deny opertors not related to field data type
                    parseDeepSchema(schema, parser, data[key]);
                }
            } else {
                if (getKeySchema(data, key, schema)) {
                    data[key] = parser(data[key], getKeySchema(data, key, schema));
                } else if (isAllowedTypeConversionLowLevelKey(key)) {
                    data[key] = parser(data[key], schema);
                }
            }
        });
    }
};

// converts if possible the given data based on validation schema retrieved from db or cache
const serialize = (data, schema) => {
    if (!schema) return;
    const parser = (value, schema) => {
        if (!schema || typeof value === 'object') throw new Error('Parsed key must be a value having a schema.');
        // console.log(value, 'to:', schema.bsonType);
        return jsonToBson(value, schema.bsonType);
    };
    // many operations
    if (Array.isArray(data)) {
        data.forEach((item) => {
            // rare case when operations contain many unnamed stages
            if (Array.isArray(item)) {
                item.forEach((subItem) => {
                    parseDeepSchema(schema, parser, subItem);
                });
            } else {
                parseDeepSchema(schema, parser, item);
            }
        });
    } else {
        parseDeepSchema(schema, parser, data);
    }
};

// data may have the following forms: object. Make this function available in frontend!
const deserialize = (data) => {
    const types = ['$numberDecimal'];
    const parser = (target, parentKey, key) => {
        if (key === '$numberDecimal') return { [parentKey]: bsonToJson(target[key], bsonSchemaToJsonSchema('decimal')[0].type) };
        return [];
    };
    types.forEach((type) => {
        fn.replaceDeepKeyParent(type, parser, data);
    });
    return data;
};

module.exports = { serialize, deserialize };
