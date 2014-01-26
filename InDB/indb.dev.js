
/*
 * InDB by Taylor Buley
 * Github -> http://github.com/editor/indb
 * Twitter -> @taylorbuley
 **/
var InDB = (function () {
    'use strict';
    var API = {
            factory: {},
            db: {},
            dbs: {},
            database: {},
            databases: {},
            store: {},
            stores: {},
            index: {},
            indexes: {},
            range: {},
            row: {},
            transaction: {},
            tx: window.IDBTransaction,
            window: window,
            cursor: {
                direction: {}
            }
        };

    /* Begin Utils */

    /* This method copies an object by value (deeply) */
    //warning: recursive
    API.clone = function (obj) {
        var clone = {};
        if (API.isNumber(obj)) {
            return parseInt(obj, 10);
        } else if (API.isArray(obj)) {
            return obj.slice(0);
        }
        API.safeIterate(obj, function (x, val) {
            if (API.isObject(val)) {
                clone[x] = API.clone(val);
            } else {
                clone[x] = val;
            }
        });
        return clone;
    };

    /* This method checks whether a variable has a value */
    API.isEmpty = function (mixed_var) {
        return (InDB.isnt(mixed_var, undefined) && InDB.isnt(mixed_var, null) && InDB.isnt(mixed_var, "") && (!API.isArray(mixed_var) || mixed_var.length > 0)) ? false : true;
    };

    /* This method returns the inverse of API.isEmpty(mixed_var) */
    API.exists = function (mixed_var) {
        return (API.isEmpty(mixed_var)) ? false : true;
    };

    /* This method tdetermins whether a given `haystack` contains a `needle` */
    API.contains = function (haystack, needle, use_key) {
        var result = false;
        if (API.exists(haystack)) {
            API.safeIterate(haystack, function (key, value) {
                if ((API.is(use_key, true) && API.is(key, needle)) || API.is(value, needle)) {
                    result = true;
                }
            });
        }
        return result;
    };

    API.hasPath = function (obj, key) {
        var keys = key.split('.'),
            k = keys.shift();
        while (k) {
            if (API.isEmpty(obj[k])) {
                return false;
            }
            obj = obj[k];
            k = keys.shift();
        }
        return true;
    };

    /* These are various utilitty methods used in type checls
     * and other assertions.
     */

    API.is = function (a, b) {
        return b === a;
    };

    API.isnt = function () {
        return false === API.is.apply(API, argument);
    };

    API.isObject = function (mixed_var) {
        return API.isType("object", mixed_var) && "[object Object]" === mixed_var.toString();
    };

    API.isString = function (mixed_var) {
        return API.isType("string", mixed_var);
    };

    API.isFunction = function (mixed_var) {
        return API.isType("function", mixed_var);
    };

    API.isArray = function (mixed_var) {
        return (mixed_var instanceof Array);
    };

    API.toNumber = function (mixed_var) {
        var result = parseInt(mixed_var, 10);
        return API.is(false, API.isNumber(result)) ? null : result;
    };

    API.isNumber = function (mixed_var) {
        return API.isType("number", mixed_var) || false === isNaN(parseInt(mixed_var, 10));
    };

    API.isNull = function (mixed_var) {
        return null === mixed_var;
    };

    API.isUndefined = function (mixed_var) {
        return undefined === mixed_var;
    };

    API.isBoolean = function (mixed_var) {
        return API.isType("boolean", mixed_var) || 'true' === mixed_var || 'false' === mixed_var;
    };

    API.isType = function (str, mixed_var) {
        return (str === typeof mixed_var);
    };

    /* This method clones `from` and applies it's values to `to`.
     * When optional `deep` is true, it does this recursively on objects.
     */
    API.extend = function (to, from) {
        var deep = arguments[2];
        API.safeIterate(API.clone(from), function (key, value) {
            if (API.is(true, deep) && API.isObject(value)) {
                to[key] = API.extend({}, value, deep);
            } else {
                to[key] = value;
            }
        });
        return to;
    };

    /* This method safely iterates through an object */
    API.safeIterate = function (item, callback) {
        var attr;
        for (attr in item) {
            if (item.hasOwnProperty(attr)) {
                callback(attr, item);
            }
        }
    };

    /* This method safely iterates through an array */
    API.safeEach = function (items, callback) {
        var x = 0,
            count = items.length,
            backwards = arguments[2],//Optional thord param, strange syntax for Google Closure Compiler
            inc = 1;
        if (true === backwards) {
            inc = -inc;
            x = count;
        }
        for (x = 0; x < count; x += inc) {
            API.safeApply(callback, items[x]);
        }
    };

    /* This method returns the length of an object syncronously,
     * or asyncronously via `on_complete` callback,
     * for a given array or object literal.
     */
    API.safeCount = function (items, on_complete) {
        var count = 0;
        if (API.isArray(items)) {
            API.safeEach(items, function () {
                count += 1;
            });
        } else if (API.isObject(items)) {
            API.safeIterate(items, function () {
                count += 1;
            });
        } else {
            count = 1;
        }
        API.safeApply(on_complete, [count]);
        return count;
    };

    /* This method collects responses from given `items` */
    API.safeCollect = function (items, context) {
        var collect = [],
            on_complete = arguments[2];
        if (API.isArray(items)) {
            API.safeEach(items, function (key, value) {
                collect.push(API.safeApply(value, context));
            });
        } else if (API.isObject(items)) {
            API.safeIterate(items, function (key, value) {
                collect.push(API.safeApply(value, context));
            });
        } else {
            collect = [];
        }
        API.safeApply(on_complete, [collect]);
        return collect;
    };


    /* This method maybe applys a `fn` */
    //warning: recursive
    API.safeApply = function (fn, args) {
        var context = arguments[2], //Optional args
            err = arguments[3];
        if (API.isFunction(fn)) {
            return fn.apply(context || API, args || []);
        }
        return API.safeApply(err, []);
    };

    /* End Utils */

    /* Begin API */

    /*
     *  Helpers
     */

    /* This method naively checks for IDB support */
    API.supported = function () {
        return API.exists(API.window.indexedDB);
    };

    /* This method applies each function in a `queue` and
     * collections the results, firing an on_complete when all
     * responses have been collected.
     */
    API.safeWatch = function (queue, on_complete, on_success, on_error, on_abort, on_blocked) {

        var expecting = queue.length || 0,
            seen = 0,
            maybeFinish = function () {
                seen += 1;
                if (API.is(seen, expecting)) {
                    API.safeApply(on_complete, arguments);
                }
            },
            own_on_success = function () {
                API.safeApply(on_success, arguments);
                maybeFinish();
            },
            own_on_error = function () {
                API.safeApply(on_error, arguments);
                maybeFinish();
            },
            own_on_abort = function () {
                API.safeApply(on_abort, arguments);
                maybeFinish();
            },
            own_on_blocked = function () {
                API.safeApply(on_blocked, arguments);
                maybeFinish();
            };

        API.safeCollect(queue, {
            on_success: own_on_success,
            on_error: own_on_error,
            on_abort: own_on_abort,
            on_blocked: own_on_blocked
        });

    };

    /*
     *   Database
     *   Namespaces:
     *       API.database
     *  Methods:
     *    API.database.close
     *    API.database.safeRequest
     *      API.database.set
     *      API.database.setVersionRequest
     *      API.database.upgradeRequest
     *    API.database.show
     *      API.databases.close
     */

    /* Close a single db named `database` */
    API.database.close = function (database) {
        var context = {
                database: database
            },
            db = API.dbs[database];
        if (API.exists(db)) {
            API.safeApply(db.close, [ context ]);
            delete API.dbs[database];
        }
    };


    /* This method caches a loaded database for later use */
    API.database.set = function (name, database) {
        API.dbs[name] = database;
        return database;
    };

    /* Before FF10, in the 1st spec, database changes need
     to happen from w/in a setVersionRequest */
    API.database.setVersionRequest = function (context) {

        var store = context.store,
            db = context.db || API.dbs[context.database],
            version = API.toNumber(db.version) || 1,
            decorate = function (event) {
                if (API.exists(store)) {
                    context.objectstore = db.objectStore(store);
                }
                context.event = event;
                return context;
            },
            request;

        if (API.isEmpty(db) || version > db.version) {
            request = db.setVersion(version);
            API.extend(request, {
                onsuccess: function (event) {
                    API.safeApply(context.on_success, [decorate(event)]);
                },
                onerror: function (event) {
                    API.safeApply(context.on_error, [decorate(event)]);
                },
                onabort: function (event) {
                    API.safeApply(context.on_abort, [decorate(event)]);
                },
                onblocked: function (event) {
                    API.safeApply(context.on_blocked, [decorate(event)]);
                }
            });
        } else {

            API.safeApply(context.on_success, [decorate(null)]);
        }

    };

    /* This is a safe method for opening a given `database` at a given
     * `version`, and optionally a given `store` along with it.
     * This will handle any upgrade events.
     */
    API.database.upgrade = function (context) {
        var db = API.dbs[context.database],
            store = context.store,
            version = API.toNumber(context.version) || db.version + 1,
            callback = function (passed_context) {
                db = passed_context.db;
                if (API.exists(db.version) && db.version >= version) {
                    var result;
                    if (API.exists(store)) {
                        context.objectstore = db.objectStore(store);
                    }
                    result = [passed_context];
                    API.safeApply(passed_context.on_success, result);
                    if (API.isnt(context.on_success, passed_context.on_success)) {
                        API.safeApply(context.on_success, result);
                    }
                } else {
                    if (API.isFunction(db.setVersion)) {
                        API.database.setVersionRequest(passed_context);
                    } else {
                        API.database.upgradeRequest(passed_context);
                    }
                }
            };

        if (API.isEmpty(db)) {
            API.database.open({
                on_success: function (context) {
                    callback(context);
                },
                on_error: function () {
                    API.safeApply(context.on_error, arguments);
                },
                on_abort: function () {
                    API.safeApply(context.on_abort, arguments);
                },
                on_blocked: function () {
                    API.safeApply(context.on_blocked, arguments);
                }
            });
        } else {
            context.db = db;
            callback(context);
        }

    };

    /* After FF10 we use the modern API */
    API.database.upgradeRequest = function (context) {
        var store = context.store,
            name = context.database,
            db = context.db || API.dbs[name],
            version = db.version + 1 || API.toNumber(context.version),
            decorate = function (event) {
                if (API.exists(store)) {
                    context.objectstore = db.objectStore(store);
                }
                context.event = event;
                return context;
            };
        if (API.exists(db) && db.version >= version) {
            context.db = db;
            API.safeApply(context.on_success, [decorate(null)]);
        } else {
            API.extend(API.window.indexedDB.open(name, version), {
                onsuccess: function (event) {
                    API.safeApply(context.on_success, [decorate(event)]);
                },
                onerror: function (event) {
                    API.safeApply(context.on_error, [decorate(event)]);
                },
                onabort: function (event) {
                    API.safeApply(context.on_abort, [decorate(event)]);
                },
                onblocked: function (event) {
                    API.safeApply(context.on_blocked, [decorate(event)]);
                },
                onupgradeneeded: function (event) {
                    var result = [decorate(event)];
                    /* Make success call here (syntactic sugar) cancellable */
                    if (API.isnt(false, API.safeApply(context.on_upgrade_needed, result))) {
                        API.safeApply(context.on_success, result);
                    }
                }
            });
        }
    };

    /* This method loads a database given a database name and version.
     * The database can be retrived on successful callback via the `db`
     * attribute on the context object */
    API.database.open = function ( context ) {
        var name = context.name,
            version = context.version,
            on_success = context.on_success,
            on_error = context.on_error,
            on_abort = context.on_abort,
            on_blocked = context.on_blocked,
            on_upgrade_needed = context.on_upgrade_needed;

        var decorate = function (event) {
                context.event = event;
                return context;
            };

        API.extend(API.window.indexedDB.open(name, version), {
            onsuccess: function (event) {
                context.db = API.database.set(name, event.result || event.target.result);
                API.safeApply(on_success, [decorate(event)]);
            },
            onblocked: function (event) {
                API.safeApply(on_blocked, [decorate(event)]);
            },
            onerror: function (event) {
                API.safeApply(on_error, [decorate(event)]);
            },
            onabort: function (event) {
                API.safeApply(on_abort, [decorate(event)]);
            },
            onupgradeneeded: function (event) {
                var result;
                context.db = API.database.set(name, event.target.result || event.result);
                result = [decorate(event)];
                /* Make success call here (syntactic sugar) cancellable by on_upgrade_needed */
                if (API.isnt(false, API.safeApply(context.on_upgrade_needed, result))) {
                    API.safeApply(context.on_success, result);
                }
            }
        });

    };

    /* This method shows a database either from the
     * cache or by passing the request to API.database.open(().
     * The database can be retrived on successful callback via the `db`
     * attribute on the context object. */
    API.database.show = function (context) {
        var database = context.database;
        if (API.exists(API.dbs[database])) {
            context.db = API.dbs[database];
            API.safeApply(context.on_complete, [context]);
        } else {
            API.database.open(context);
        }
    };

    /* Close all open dbs */
    API.databases.close = function () {
        API.safeIterate(API.dbs, function (name, database) {
            API.safeApply(database.close, []);
            delete API.dbs[name];
        });
    };

    /*
     *  Stores
     *  Namespaces
     *      API.store
     *      API.stores
     *  Methods:
     *      API.store.create
     *      API.store.options
     *      API.store.show
     *      API.stores.create
     *      API.stores.show
     */

    /* This method clears a `database` object `store` of any objects. */
    API.store.clear = function (database, store, on_success, on_error, on_abort, on_complete) {
        var context = {
                database: database,
                store: store,
                on_complete: on_complete,
                on_success: on_success,
                on_error: on_error,
                on_abort: on_abort
            },
            transaction = API.transaction.create(database, store, API.transaction.read_write()),
            objectstore = transaction.objectStore(store),
            request = objectstore.clear,
            decorate = function (event) {
                context.event = event;
                return context;
            };

        API.extend(request, {
            onsuccess: function (event) {
                API.safeApply(context.on_success, [decorate(event)]);
            },
            onerror: function (event) {
                API.safeApply(context.on_error, [decorate(event)]);
            },
            onabort: function (event) {
                API.safeApply(context.on_abort, [decorate(event)]);
            }
        });
    };

    /* This method creates a store named `name` on the given `database`
     * return true if request is successfully requested (no bearing on result)
     * autoinc_key defaults to false if a key is specified;
     * key gets set to "key" and autoincrements when key is not specified */
    API.store.create = function (database, name, key, autoinc_key, on_success, on_error, on_abort, on_blocked, on_upgrade_needed, version) {
        var context = {
                database: database,
                name: name,
                version: API.toNumber(version),
                key_path: API.isEmpty(key) ? null : key,
                autoinc_key: API.isBoolean(autoinc_key) ? autoinc_key : false,
                success: on_success,
                error: on_error,
                on_abort: on_abort,
                on_blocked: on_blocked,
                on_upgrade_needed: on_upgrade_needed
            },
            options = {
                keyPath: context.key_path,
                autoIncrement: context.autoinc_key
            };
        API.database.upgrade({
            database: database,
            on_success: function (context) {
                /* createObjectStore throws catchable errors */
                try {
                    context.store = context.db.createObjectStore(name, options);
                    API.safeApply(on_success, [context]);
                } catch (error) {
                    context.error = error;
                    if (API.is(error.code, API.window.IDBDatabaseException.CONSTRAINT_ERR)) {
                        context.message = "Store already exists";
                    }
                    API.safeApply(on_error, [context]);
                }
            },
            on_error: function (context) {
                API.safeApply(on_error, [context]);
            },
            on_abort: function (context) {
                API.safeApply(on_abort, [context]);
            },
            on_blocked: function (context) {
                API.safeApply(on_blocked, [context]);
            }
        });
    };

    /* Returns an existential boolean syncronously, or asyncronously through
     * an on_complete callback, given a database, and store.
     * The way we check if a store exists is to open transaction and search
     * the `objectStoreNames` property haystack with the given store needle. */
    /* TODO: Explore using db.objectStores[ 'contains' ](name ) when available */
    API.store.exists = function (database, store, on_complete) {
        var transaction = API.transaction.create(database, store),
            stores = API.exists(transaction) ? transaction.objectStoreNames : null,
            result = API.contains(stores, store) ? true : false;
        API.safeApply(on_complete, [result]);
        return result;
    };

    /* Returns an options object syncronously, or asyncronously
     * via a on_complete callback, given a store. Preforms
     * integrity checks on the data, throwing errors when assertions fail. */
    API.store.options = function (key, autoinc_key, on_complete) {
        var result = {
            keyPath: (API.isEmpty(key)) ? null : key,
            autoIncrement: (API.isBoolean(autoinc_key)) ? autoinc_key : false
        };
        API.safeApply(on_complete, [result]);
        return result;
    };

    /* Returns a single store syncronously, or asyncronously through
     * an on_complete callback, given a database and store. */
    API.store.show = function (database, store, on_complete) {
        var transaction = API.transaction.create(database, store),
            objectstore = transaction.objectStore(store),
            result = API.isEmpty(objectstore) ? null : {
                'name': objectstore.name,
                'indexes': objectstore.indexNames,
                'key': objectstore.keyPath
            };
        API.safeApply(on_complete, [result]);
        return result;
    };

    /* Creates a batch of stores, proxying success/error/abort callbacks
     * and watching for completion before calling an on_complete callback */
    API.stores.create = function (database, stores, on_complete, on_success, on_error, on_abort) {
        var queue = [],
            context = {
                database: database,
                stores: stores,
                on_complete: on_complete,
                on_success: on_success,
                on_error: on_error,
                on_abort: on_abort
            },
            errored = false;
        API.safeEach(stores, function (index, store) {
            var options = stores[store],
                key = null,
                autoinc_key = false,
                unique = false;
            if (API.isString(options)) {
                /* Syntactic sugar: if options var is a string pass it as 'key' var to
                 * create an options object */
                options = API.store.options(options);
            }
            if (!API.store.exists(database, store)) {
                /* Syntactic sugar to allow store: { key: unique } shorthand */
                if (API.hasPath(options, 'key')) {
                    key = options.key;
                    unique = options.unique;
                    autoinc_key = options.incrementing_key;
                } else {
                    API.safeIterate(options, function (xkey, xvalue) {
                        key = xkey;
                        unique = xvalue;
                        autoinc_key = false;
                    });
                }
                (function (fn, args) {
                    queue.push([fn, args]);
                }(API.store.create, [database, store, key, autoinc_key, on_success, on_error, on_abort]));
            } else {
                context.message = "Store already exists";
                context.store = store;
                API.safeApply(on_error, [context]);
                errored = true;
            }
        });
        if (API.is(errored, true)) {
            return false;
        }
        API.safeWatch(queue, function () {
            API.safeApply(on_complete, arguments);
        }, function () {
            API.safeApply(on_success, arguments);
        }, function () {
            API.safeApply(on_error, arguments);
        }, function () {
            API.safeApply(on_abort, arguments);
        });
        return true;
    };

    /* Returns all stores syncronously, or asyncronously through
     * an on_complete callback, given a database. */
    API.stores.show = function (database, on_complete) {
        var db = API.dbs[database],
            result = db.objectStoreNames;
        API.safeApply(on_complete, [result]);
        return result;
    };

    /*
     *  Indexes
     *  Namespaces
     *      API.index
     *      API.indexes
     *  Methods:
     *      API.index.create
     *      API.index.exists
     *      API.index.show
     *      API.index.delete
     *      API.indexes.show
     *      API.indexes.create
     */

    /* This method creates a given index on `key` using `name` and optiona
     * `unique` and `multirow` params (both default to false).
     */
    API.index.create = function (database, store, key, name, unique, multirow, on_success, on_error, on_abort, on_upgrade_needed, on_blocked) {

        var context = {
                database: database,
                store: store,
                key: key,
                name: name,
                unique: unique,
                multirow: multirow,
                on_success: on_success,
                on_error: on_error,
                on_abort: on_abort,
                on_blocked: on_blocked,
                on_upgrade_needed: on_upgrade_needed
            },
            doWork = function (passed_context) {
                var db = passed_context.db,
                    transaction;
                try {
                    transaction = db.transaction(store, API.transaction.version_change()).objectStore(store);
                    try {
                        transaction.createIndex(name, key, {
                            'unique': unique,
                            'multirow': multirow
                        });
                        API.safeApply(on_success, [context]);
                    } catch (error) {
                        context.error = error;
                        API.safeApply(on_error, [context]);
                    }
                } catch (error) {
                    context.error = error;
                    API.safeApply(on_error, [context]);
                }
            };
        unique = unique || false;
        multirow = multirow || false;

        /* Request */
        API.database.upgrade({
            database: database,
            on_success: function (passed_context) {
                doWork(passed_context);
            },
            on_error: function () {
                API.safeApply(on_error, [context]);
            },
            on_abort: function () {
                API.safeApply(on_abort, [context]);
            },
            on_blocked: function () {
                API.safeApply(on_blocked, [context]);
            },
            on_upgrade_needed: function () {
                API.safeApply(on_upgrade_needed, [context]);
            }
        });

    };

    /* Returns a single index syncronously, or asyncronously through
     * an on_complete callback, given a database, store and index. */
    API.index.show = function (database, store, index, on_complete) {
        var transaction = API.transaction.create(database, store),
            idx = API.exists(transaction) ? transaction.index(index) : null,
            result = API.isEmpty(idx) ? null : {
                'name': idx.name,
                'key': idx.keyPath,
                'unique': idx.unique
            };
        API.safeApply(on_complete, result);
        return result;
    };

    /* Returns an existential boolean syncronously, or asyncronously through
     * an on_complete callback, given a database, store and index.
     * The way we check if an index exists is to open a transaction on the
     * store and iterate through its `indexNames` property. */
    API.index.exists = function (database, store, index, on_complete) {
        var transaction = API.transaction.create(database, store),
            indexes = API.exists(transaction) ? transaction.indexNames : null,
            result = API.contains(indexes, index) ? true : false;
        API.safeApply(on_complete, [result]);
        return result;
    };

    /* Creates a batch of indexes, proxying success/error/abort callbacks
     * and watching for completion before calling an on_complete callback */
    API.indexes.create = function (database, objects, on_complete, on_success, on_error, on_abort, on_blocked) {
        var queue = [],
            context = {
                database: database,
                indexes: objects,
                on_complete: on_complete,
                on_success: on_success,
                on_error: on_error,
                on_abort: on_abort,
                on_blocked: on_blocked
            },
            errored = false;
        API.safeIterate(objects, function (store, indexes) {
            API.safeIterate(indexes, function (name, options) {
                var key,
                    unique = false,
                    multirow = false,
                    opts;
                if (!API.index.exists(database, store, name)) {
                    if (API.hasPath(options, 'key')) {
                        key = options.key;
                        unique = options.unique;
                    } else {
                        API.safeIterate(options, function (attrib) {
                            opts = options[attrib];
                            key = attrib;
                            if (API.hasPath(opts, 'unique' ) || API.hasPath(opts, 'multirow' )  ) {
                                unique = opts.unique;
                                multirow = opts.multirow;
                            } else {
                                unique = options[attrib];
                            }
                        });
                    }
                    (function (fn, args) {
                        queue.push([fn, args]);
                    }(API.index.create, [database, store, key, name, unique, multirow, on_success, on_error, on_abort]));
                } else {
                    context.error = 'Index already exists';
                    errored = true;
                    API.safeApply(on_error, [context]);
                }
            });
        });
        if (API.is(errored, true)) {
            return false;
        }
        API.safeWatch(queue, function () {
            API.safeApply(on_complete, arguments);
        }, function () {
            API.safeApply(on_success, arguments);
        }, function () {
            API.safeApply(on_error, arguments);
        }, function () {
            API.safeApply(on_abort, arguments);
        }, function () {
            API.safeApply(on_blocked, arguments);
        });
        return true;
    };

    /* This method deletes an index with a given `name` on a given
     * `database` and `store`. It creates an implicit database version upgrade.
     */
    API.index['delete'] = function (database, store, name, on_success, on_error, on_abort, on_upgrade_needed, on_blocked) {

        var context = {
                database: database,
                store: store,
                name: name,
                on_success: on_success,
                on_error: on_error,
                on_abort: on_abort,
                on_blocked: on_blocked,
                on_upgrade_needed: on_upgrade_needed
            },
            doWork = function (passed_context) {
                var objectstore = passed_context.objectstore;
                try {
                    objectstore.deleteIndex(name);
                    API.safeApply(on_success, [context]);
                } catch (error) {
                    context.error = error;
                    API.safeApply(on_error, [context]);
                }
            };

        /* Request */
        API.database.upgrade({
            database: database,
            store: store,
            on_success: function (passed_context) {
                doWork(passed_context);
            },
            on_error: function () {
                API.safeApply(on_error, [context]);
            },
            on_abort: function () {
                API.safeApply(on_abort, [context]);
            },
            on_blocked: function () {
                API.safeApply(on_blocked, [context]);
            },
            on_upgrade_needed: function () {
                API.safeApply(on_upgrade_needed, [context]);
            }
        });

    };

    /* Returns all indexes syncronously, or asyncronously through
     * an on_complete callback, given a database and store. */
    API.indexes.show = function (database, store, on_complete) {
        var transaction = API.transaction.create(database, store),
            result = transaction.indexNames;
        API.safeApply(on_complete, [result]);
        return result;
    };

    /*
     *  Transactions
     *  Namespaces:
     *      API.transaction
     *  Methods:
     *      API.transaction.read
     *      API.transaction.read_write
     *      API.transaction.version_change
     *      API.transaction.write
     */

    /* Transaction types */
    API.transaction.read = function () {
        return API.tx.READ_ONLY;
    };
    API.transaction.read_write = function () {
        return API.tx.READ_WRITE;
    };
    API.transaction.write = function () {
        return API.tx.READ_WRITE;
    };
    API.transaction.version_change = function () {
        return API.tx.VERSION_CHANGE;
    };

    /* This method is a transaction factory for transaction of a given `type` on a given
     * `database` and `store` */
    API.transaction.create = function (database, store, type, on_complete) {
        var db = API.database[database],
            result;
        type = type || API.transaction.read_write();
        result = db.transaction([store], type);
        API.safeApply(on_complete, [ result ] );
        return result;
    };

    /**
     * Directions
     *
     **/

    /* Direction types */

    API.cursor.direction.next = function (no_dupes) {
        return no_dupes ? API.window.IDBCursor.NEXT_NO_DUPLICATE : API.window.IDBCursor.NEXT;
    };

    API.cursor.direction.previous = function (no_dupes) {
        return no_dupes ? API.window.IDBCursor.PREV_NO_DUPLICATE : API.window.IDBCursor.PREV;
    };

    API.cursor.isDirection = function (direction) {
        return (API.isNumber(direction) && direction >= API.cursor.direction.next() && direction <= API.cursor.direction.previous(true)) ? true : false;
    };

    /*
     * Key Ranges
     */

    API.range.only = function (value) {
        return API.range.get(value, null, null, null, null);
    };
    API.range.left = function (left_bound) {
        return API.range.get(null, left_bound, null, false, null);
    };
    API.range.left_open = function (left_bound) {
        return API.range.get(null, left_bound, null, true, null);
    };
    API.range.right = function (right_bound) {
        return API.range.get(null, null, right_bound, null, false);
    };
    API.range.right_open = function (right_bound) {
        return API.range.get(null, null, right_bound, null, true);
    };

    /* This method returns an IDBKeyRange given a range type
     * and returns false if type is not valid.
     * Valid types include: bound, leftBound, only, rightBound */
    /* This approach adds syntatic sugar by using duck typing
     * to determine key type */
    /* For more info on key types: https://developer.mozilla.org/en/indexeddb/idbkeyrange*/
    API.range.get = function (value, left_bound, right_bound, includes_left_bound, includes_right_bound) {
        var result = false;
        if (API.exists(left_bound) && API.exists(right_bound) && API.exists(includes_left_bound) && API.exists(includes_right_bound)) {
            result = API.window.IDBKeyRange.bound(left_bound, right_bound, includes_left_bound, includes_right_bound);
        } else if (API.exists(left_bound) && API.exists(includes_left_bound)) {
            result = API.window.IDBKeyRange.lowerBound(left_bound, includes_left_bound);
        } else if (API.exists(right_bound) && API.exists(includes_right_bound)) {
            result = API.window.IDBKeyRange.upperBound(right_bound, includes_right_bound);
        } else if (API.exists(value)) {
            result = API.window.IDBKeyRange.only(value);
        }
        return result;
    };

    /*
     *  Rows
     *
     *  Namespaces:
     *      API.row
     *
     *  Methods:
     *      API.row.add
     *      API.row[ 'delete' ]
     *      API.row.get
     *      API.row.put
     *      API.row.result
     *      API.row.update
     *      InDb.row.value
     *
     */

    /* This method adds a `data` object to an object `store` `database`. */
    API.row.add = function (database, store, data, on_success, on_error, on_abort) {

        var context = {
                database: database,
                store: store,
                data: data,
                on_success: on_success,
                on_error: on_error,
                on_abort: on_abort
            },
            transaction = API.transaction.create(database, store, API.transaction.read_write()),
            objectstore = transaction.objectStore(store),
            request,
            decorate = function (event) {
                context.event = event;
                return context;
            };

        if (API.isFunction(data)) {
            data = data();
        } else {
            data = API.clone(data);
        }

        request = objectstore.add(data);
        request = API.extend(request, {
            onsuccess: function (event) {
                context.result = API.row.value(event);
                return API.safeApply(on_success, [decorate(event)]);
            },
            onerror: function (event) {
                return API.safeApply(on_error, [decorate(event)]);
            },
            onabort: function (event) {
                return API.safeApply(on_abort, [decorate(event)]);
            }
        });

    };

    /* This method deletes a `database`'s object `store` row given a `key` */
    API.row['delete'] = function (database, store, key, on_success, on_error, on_abort, on_complete) {
        var context = {
                database: database,
                store: store,
                key: key,
                on_success: on_success,
                on_error: on_error,
                on_abort: on_abort,
                on_complete: on_complete
            },
            decorate = function (event) {
                context.event = event;
                return context;
            },
            transaction = API.transaction.create(database, store, API.transaction.write()),
            objectstore = transaction.objectStore(store),
            request = objectstore["delete"](key);
        API.extend(request, {
            onsuccess: function (event) {
                context.result = API.row.value(event);
                return API.safeApply(on_success, [decorate(event)]);
            },
            onerror: function (event) {
                return API.safeApply(on_error, [decorate(event)]);
            },
            onabort: function (event) {
                return API.safeApply(on_abort, [decorate(event)]);
            }
        });

    };

    /* This method gets a row from an object store named `store` in a database
     * named `database` using an optional `index` and `key`
     */
    API.row.get = function (database, store, key, index, on_success, on_error, on_abort, on_complete) {
        var context = {
                database: database,
                store: store,
                key: key,
                index: index,
                on_success: on_success,
                on_error: on_error,
                on_abort: on_abort,
                on_complete: on_complete
            },
            transaction = API.transaction.create(database, store, API.transaction.read(), on_complete),
            objectstore = transaction.objectStore(store),
            idx,
            request,
            decorate = function (event) {
                context.event = event;
                return context;
            };
        if (API.exists(index)) {
            try {
                idx = objectstore.index(index);
                request = idx.get(key);
            } catch (error) {
                context.error = error;
                return API.safeApply(on_error, [context]);
            }
        } else {
            request = transaction.get(key);
        }

        API.extend(request, {
            onsuccess: function (event) {
                context.value = API.row.value(event);
                API.safeApply(on_success([decorate(event)]));
            },
            onerror: function (event) {
                return API.safeApply(on_success([decorate(event)]));
            },
            onabort: function (event) {
                return API.safeApply(on_success([decorate(event)]));
            }
        });

    };

    /* This method puts a `data` object to a `database` object `store` using a `key`.
     * This change is made without regard to its previous state. */
    API.row.put = function (database, store, data, key, on_success, on_error, on_abort) {
        var context = {
                database: database,
                store: store,
                data: data,
                on_success: on_success,
                on_error: on_error,
                on_abort: on_abort
            },
            transaction = API.transaction.create(database, store, API.transaction.read_write()),
            objectstore = transaction.objectStore(store),
            request,
            decorate = function (event) {
                context.event = event;
                return context;
            };

        if (API.isFunction(data)) {
            data = data();
        } else {
            data = API.clone(data);
        }

        try {
            request = (API.exists(key)) ? objectstore.put(data, key) : objectstore.put(data);
            request = API.extend(request, {
                onsuccess: function (event) {
                    context.result = API.row.value(event);
                    return API.safeApply(on_success, [decorate(event)]);
                },
                onerror: function (event) {
                    return API.safeApply(on_error, [decorate(event)]);
                },
                onabort: function (event) {
                    return API.safeApply(on_abort, [decorate(event)]);
                }
            });
        } catch (error) {
            context.error = error;
            API.safeApply(on_error, [decorate(context)]);
        }
    };

    /* This helper method plucks a result from a request row */
    API.row.result = function (event) {
        event = API.hasPath(event, 'event') ? event.event : event;
        return API.hasPath(event, 'result') ? event.result : null;
    };

    /* This method updates a `database` `store` row given a `key` and optiona index. */
    API.row.update = function (database, store, key, index, data, replace, expecting, on_success, on_error, on_abort, on_complete, limit) {
        var context = {
                database: database,
                store: store,
                key: key,
                index: index || null,
                data: data,
                limit: limit || null,
                replace: replace || false,
                expecting: expecting || null,
                on_success: on_success,
                on_error: on_error,
                on_abort: on_abort,
                on_complete: on_complete
            },
            total = 0,
            callback = function (passed_context) {
                var result = API.row.value(passed_context.event),
                    flagged = false,
                    instance = {},
                    tmp;
                if (API.exists(result)) {
                    if (API.isFunction(data)) {
                        data = data(result);
                    } else {
                        API.safeIterate(data, function (attr, thing) {
                            var value = result[attr];
                            if (API.isFunction(thing)) {
                                instance[attr] = thing(value);
                            } else {
                                instance[attr] = value;
                            }
                        });
                    }
                    if (API.exists(expecting)) {
                        API.safeIterate(expecting, function (attr, value) {
                            var response = result[attr];
                            if (API.isFunction(value)) {
                                value = value(response);
                            }
                            if (API.exists(response) && API.exists(value) && API.isnt(result[attr], value)) {
                                flagged = true;
                            }
                        });
                    }
                    if (API.is(replace, false) && API.exists(result)) {
                        tmp = API.clone(result);
                        API.safeIterate(data, function (attr, value) {
                            var pre_value = data[attr],
                                previous_value = tmp[attr];
                            if (!API.isFunction(pre_value)) {
                                value = pre_value;
                            } else {
                                value = pre_value(previous_value);
                            }
                            tmp[attr] = value;
                        });
                        instance = tmp;
                    } else {
                        instance = data;
                    }
                    if (API.is(flagged, false) && (API.isEmpty(limit) || total < limit)) {
                        API.row.put(database, store, instance, null, function (context) {
                            context.update = instance;
                            API.safeApply(on_success, [context]);
                        }, on_error, on_abort, on_complete);
                    }
                    if (API.is(flagged, false) && (API.isEmpty(limit) || total < limit)) {
                        total += 1;
                    }
                }
            };
        limit = context.limit || null;
        API.row.get(database, store, key, index, callback, on_error, on_abort);
    };

    /* This helper method plucks a value from a request row */
    API.row.value = function (event) {
        event = API.hasPath(event, 'event') ? event.event : event;
        return API.hasPath(event, 'target.result') ? event.target.result : null;
    };

    /*
     *  Cursors
     *
     *  Namespaces:
     *      API.cusor
     *
     *  Methods:
     *      API.cursor.delete
     *      API.cursor.get
     *      API.cursor.result
     *      API.cursor.value
     */

    /* This method deletes rows from a `database` `store` matching the
     * `index` cursor with the given `key_range`
     */
    API.cursor['delete'] = function (database, store, index, key_range, direction, limit, expecting, on_success, on_error, on_abort, on_complete) {
        var context = {
                database: database,
                store: store,
                index: index || null,
                key_range: key_range,
                direction: direction || API.cursor.direction.next(),
                expecting: expecting || null,
                limit: limit || null,
                on_success: on_success,
                on_error: on_error,
                on_abort: on_abort,
                on_complete: on_complete
            },
            transaction = API.transaction.create(database, store, API.transaction.read_write()),
            request,
            idx,
            total = 0,
            decorate = function (event) {
                context.event = event;
                return context;
            };
        try {
            if (!API.isEmpty(index)) {
                idx = transaction.index(index);
                request = idx.openCursor(key_range, direction);
            } else {
                request = transaction.openCursor(key_range, direction);
            }
            request = API.extend(request, {
                onsuccess: function (event) {
                    var cursor = API.row.value(event),
                        result = API.cursor.value(event),
                        flagged = false,
                        delete_request,
                        maybeFinish = function () {
                            total += 1;
                            if (API.isNumber(limit) && total >= limit) {
                                API.safeApply(on_complete, [context]);
                            } else {
                                if (API.exists(cursor) && API.isFunction(cursor['continue'])) {
                                    try {
                                        cursor['continue']();
                                    } catch (error) {
                                        API.safeApply(on_complete, [context]);
                                    }
                                }
                            }
                        };
                    context = decorate(event);
                    context.result = result;
                    if (API.exists(expecting)) {
                        API.safeIterate(expecting, function (attr, expected) {
                            var value = (API.hasPath(result, attr)) ? result[attr] : null;
                            if (API.isFunction(expected)) {
                                expected = expected(value);
                            }
                            if (API.exists(value) && API.exists(expected) && API.isnt(value, expected)) {
                                flagged = true;
                            }
                        });
                    }
                    if (API.is(flagged, false) && API.exists(cursor) && API.exists(result)) {
                        try {
                            delete_request = cursor['delete']();
                            delete_request = API.extend(delete_request, {
                                onsuccess: function () {
                                    maybeFinish();
                                    API.safeApply(on_success, arguments);
                                },
                                onerror: function () {
                                    API.safeApply(on_error, arguments);
                                }
                            });
                        } catch (error) {
                            context.error = error;
                            return API.safeApply(on_error, [context]);
                        }
                    } else {
                        return API.safeApply(on_error, [context]);
                    }
                },
                onerror: function (event) {
                    return API.safeApply(on_error, [decorate(event)]);
                },
                onabort: function (event) {
                    return API.safeApply(on_abort, [decorate(event)]);
                }
            });
        } catch (error) {
            context.error = error;
            API.safeApply(on_error, [context]);
        }
    };

    /* This method gets rows from a `database` object `store` using a cursor creating
     * with an `index`, `key_range` and optional `direction`. */
    API.cursor.get = function (database, store, index, key_range, direction, expecting, limit, on_success, on_error, on_abort, on_complete) {
        var context = {
                database: database,
                store: store,
                index: index || null,
                key_range: key_range,
                direction: API.cursor.isDirection(direction) ? direction : API.cursor.direction.next(),
                expecting: expecting || null,
                limit: limit || null,
                on_success: on_success,
                on_error: on_error,
                on_abort: on_abort,
                on_complete: on_complete
            },
            transaction = API.transaction.create(database, store, API.transaction.read_write()),
            request,
            idx,
            total = 0,
            decorate = function (event) {
                context.event = event;
                return context;
            };
        try {
            if (!API.isEmpty(index)) {
                idx = transaction.index(index);
                request = idx.openCursor(key_range, direction);
            } else {
                request = transaction.openCursor(key_range, direction);
            }
            request = API.extend(request, {
                onsuccess: function (event) {
                    var cursor = API.row.value(event),
                        result = API.cursor.value(event),
                        flagged = false,
                        maybeFinish = function () {
                            total += 1;
                            if (API.isNumber(limit) && total >= limit) {
                                API.safeApply(on_complete, [context]);
                            } else {
                                if (API.exists(cursor) && API.isFunction(cursor['continue'])) {
                                    try {
                                        cursor['continue']();
                                    } catch (error) {
                                        API.safeApply(on_complete, [context]);
                                    }
                                }
                            }
                        };
                    context = decorate(event);
                    context.result = result;
                    if (API.exists(expecting)) {
                        API.safeIterate(expecting, function (attr, expected) {
                            var value = (API.hasPath(result, attr)) ? result[attr] : null;
                            if (API.isFunction(expected)) {
                                expected = expected(value);
                            }
                            if (API.exists(value) && API.exists(expected) && API.isnt(value, expected)) {
                                flagged = true;
                            }
                        });
                    }
                    if (InDB.is(flagged,true)) {
                        API.safeApply(on_error, [context]);
                    } else {
                        API.safeApply(on_success, [context]);
                    }
                    maybeFinish();
                },
                onerror: function (event) {
                    return API.safeApply(on_error, [decorate(event)]);
                },
                onabort: function (event) {
                    return API.safeApply(on_abort, [decorate(event)]);
                }
            });
        } catch (error) {
            context.error = error;
            API.safeApply(on_error, [context]);
        }
    };

    /* This decorator uses API.row.value to pluck a result from a cursor row */
    API.cursor.result = function (event) {
        return API.row.value(event);
    };

    /* This method updates rows from a `database` `store` matching the
     * `index` cursor with the given `key_range`
     */
    API.cursor.update = function (database, store, index, key_range, data, direction, limit, replace, expecting, on_success, on_error, on_abort, on_complete) {
        var context = {
                database: database,
                store: store,
                index: index || null,
                key_range: key_range,
                direction: API.cursor.isDirection(direction) ? direction : API.cursor.direction.next(),
                expecting: expecting || null,
                replace: replace || true,
                limit: limit || null,
                on_success: on_success,
                on_error: on_error,
                on_abort: on_abort,
                on_complete: on_complete
            },
            transaction = API.transaction.create(database, store, API.transaction.read_write()),
            request,
            idx,
            total = 0,
            decorate = function (event) {
                context.event = event;
                return context;
            };
        if (!API.isEmpty(index)) {
            idx = transaction.index(index);
            request = idx.openCursor(key_range, direction);
        } else {
            request = transaction.openCursor(key_range, direction);
        }
        API.extend(request, {
            onsuccess: function (event) {
                var cursor = API.row.value(event),
                    result = API.clone(API.cursor.value(event)),
                    flagged = false,
                    instance = {},
                    tmp,
                    maybeFinish = function () {
                        total += 1;
                        if (API.isNumber(limit) && total >= limit) {
                            API.safeApply(on_complete, [decorate(event)]);
                        } else {
                            var update_request = cursor.update(instance);
                            context.update = instance;
                            update_request = API.extend(update_request, {
                                onsuccess: function (event) {
                                    context.update = instance;
                                    API.safeApply(on_success, [decorate(event)]);
                                    cursor['continue']();
                                },
                                on_error: function (event) {
                                    return API.safeApply(on_error, [decorate(event)]);
                                }
                            });
                        }

                    };
                context.result = result;
                context.cursor = cursor;
                context = decorate(event);
                if (API.exists(result)) {
                    if (API.isFunction(data)) {
                        instance = data(result);
                    } else {
                        API.safeIterate(data, function (attr, thing) {
                            var value = result[attr];
                            if (API.isFunction(thing)) {
                                instance[attr] = thing(value);
                            } else {
                                instance[attr] = value;
                            }
                        });
                        if (API.exists(expecting)) {
                            API.safeIterate(expecting, function (attr, value) {
                                var response = result[attr];
                                if (API.isFunction(value)) {
                                    value = value(response);
                                }
                                if (API.exists(response) && API.exists(value) && API.isnt(result[attr], value)) {
                                    flagged = true;
                                }
                            });
                        }
                        if (API.is(replace, false) && API.exists(result)) {
                            tmp = API.clone(result);
                            API.safeIterate(data, function (attr, value) {
                                var pre_value = data[attr],
                                    previous_value = tmp[attr];
                                if (!API.isFunction(pre_value)) {
                                    value = pre_value;
                                } else {
                                    value = pre_value(previous_value);
                                }
                                tmp[attr] = value;
                            });
                            instance = tmp;
                        } else {
                            instance = data;
                        }
                        if (API.is(flagged, false) && (API.isEmpty(limit) || total < limit)) {
                            API.row.put(database, store, instance, null, function (context) {
                                context.update = instance;
                                API.safeApply(on_success, [context]);
                            }, on_error, on_abort, on_complete);
                        }
                    }
                    maybeFinish();
                } else {
                    API.safeApply(on_error, [result]);
                }
            },
            onerror: function (event) {
                return API.safeApply(on_error, [decorate(event)]);
            },
            onabort: function (event) {
                return API.safeApply(on_abort, [decorate(event)]);
            }
        });
    };

    /* This method plucks a value from a cursor row */
    API.cursor.value = function (event) {
        event = API.hasPath(event, 'event') ? event.event : event;
        return API.hasPath(event, 'target.result.value') ? event.target.result : null;
    };

    /*
     * The MIT License (MIT)
     * Copyright (c) 2011 Buley LLC
     *
     * Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
     *
     * The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
     *
     * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
     *
     */

    return API;

}());