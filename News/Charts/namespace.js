/* Data Zip */
/* Goal: 1) Transform semi-structured JS objects into CSV and the standard Google Data Table object format, making it usable w/the Google Chart API. 2) Use the ChartWrapper class to create standard chart types (http://code.google.com/apis/chart/interactive/docs/reference.html#chartwrapperobject)
*/
var Namespace = {};
Namespace.cache = Namespace.cache || {};
Namespace.utils = Namespace.utils || {};
Namespace.data = Namespace.data || {};
Namespace.data.utils = Namespace.data.utils || {};
Namespace.data.type = Namespace.data.type || {};
Namespace.data.types = Namespace.data.types || {};
Namespace.data.value = Namespace.data.value || {};
Namespace.data.values = Namespace.data.values || {};
Namespace.data.table = Namespace.data.table || {};
Namespace.data.row = Namespace.data.row || {};
Namespace.data.column = Namespace.data.column || {};
Namespace.data.cell = Namespace.data.cell || {};
Namespace.chart = Namespace.chart || {};
Namespace.charts = Namespace.charts || {};

/* CONFIG */

/* Data Types */

Namespace.data.types = {
    'table': {
        'transform': {
            'raw': function() {},
        },
        'validate': function() {}
    },
    'input': {
        'transform': {
            'raw': function() {},
        },
        'validate': function() {}
    },
    'raw': {
        'transform': {
            'table': function() {},
            'csv': function() {}
        },
        'validate': function() {}
    },
    'csv': {
        'transform': {
            'raw': function() {},
        },
        'validate': function() {}
    }
};

Namespace.data.types.raw.transform.table = function(obj) {
    var newobj = obj;

    
    return newobj;
};

Namespace.data.types.raw.transform.csv = function(obj) {

};

Namespace.data.types.raw.transform.filter = function(obj) {
    var newobj = (null !== obj && 'undefined' !== typeof obj) ? obj : {},
        objlen = obj.length,
        x, current, attr;
    if (Namespace.utils.isArray(obj)) {
        //zero-indexed array
        for (x = objlen; x !== 0; x -= 1) {
            current = obj[x];
            //forgive non arrays by coercing them into a single item list
            if (Namespace.utils.isArray(current)) {
                newobj[x] = current;
            } else {
                newobj[x] = [current];
            }
        }
    } else {
        //unique id object
        for (attr in obj) {
            if (obj.hasOwnProperty(attr)) {
                current = obj[attr];
                if (Namespace.utils.isArray(current)) {
                    newobj[attr] = current;
                } else {
                    newobj[attr] = [current];
                }
            }
        };
    }
    return newobj;
};

Namespace.data.types.raw.transform.validate = function(obj) {

};


/* type utilities */

/* gets a type; generic */
/* returns type object else null if undefined */
Namespace.data.type.get = function(type) {
    var types = Namespace.data.types[type];
    return ('undefined' !== typeof types) ? types : null;
};

/* sets a type; generic */
/* returns false if doesn't validate, else true */
Namespace.data.type.set = function(type, obj) {
    //TODO: if has a validate method, use it
    if (Namespace.data.type.validate(type, obj)) {
        Namespace.data.types[type] = obj;
        return true;
    }
    return false;
};

/* updates invidiual attributes of a type; generic */
/* returns value of Namespace.data.type.set */
Namespace.data.type.update = function(type, attrs) {
    var typeobj = Namespace.data.type.get(type);
    for (var attr in attrs) {
        typeobj[attr] = attrs[attr];
    }
    return Namespace.data.type.set(type, typeobj);
};

/* type transformsFrom other_type if other_type transformsTo type */
/* returns inverse of Namespace.data.type.tranformsTo */
Namespace.data.type.tranformsFrom = function(type, other_type) {
    //TODO: real implementation
    return Namespace.data.type.tranformsTo(other_type, type);
};

/* returns true if a type can be converted from another type, else false */
Namespace.data.type.tranformsTo = function(type, other_type) {
    if ('undefined' !== typeof Namespace.data.types[type] && 'undefined' !== typeof Namespace.data.types[type]['transform'] && 'function' === typeof Namespace.data.types[type]['transform'][other_type]) {
        return true;
    }
    return false;
};

/* returns  null if can't be transformed from type to other_type, else returns a transformed object of type to other_type */
Namespace.data.type.transform = function(type, other_type, obj) {
    if (Namespace.data.type.tranformsTo(type, other_type)) {
        return Namespace.data.types[type]['transform'][other_type](obj);
    }
    return null;
};

/* returns true if a type can be validated, else false. note that this is different than testing whether the type object can be validated (which is always true). */
Namespace.data.type.canValidate = function(type) {
    var typeobj = Namespace.data.type.get(type);
    if ('function' === typeof typeobj.validate) {
        return true;
    }
    return false;
};


/* validates a type object (note that this is different than
    validating an object for a type i.e. Namespace.data.value.validate()) */
Namespace.data.type.validate = function(type, obj) {

    // Check to see if confirms to a vaild type
    // using a set of tests. returns false if a test fails.
    // Well-formed (if present) methods:
    //   obj.validate: fn 
    //   obj.transform: { 'optional1': fn }
    //   obj.filter: fn
    // * Denotes required
    if ('undefined' === typeof obj) {
        return false;
    }
    if ('undefined' !== typeof obj.validate && 'function' !== typeof obj.validate) {
        return false;
    }
    if ('undefined' !== typeof obj.filter && 'function' !== typeof obj.filter) {
        return false;
    }
    if ('undefined' !== typeof obj.transform) {
        for (var attr in obj.transform) {
            if ('undefined' !== typeof obj.transform[attr] && 'function' !== typeof obj.transform[attr]) {
                return false;
            }
        }
    }

    return true;

};

/* value utilities */

/* values are composite data types made up of a type and value property. a value can also have an optional timestamp property. */

/* returns true if an object's own types or one layer connections can convert to a type, else false */
Namespace.data.value.transformsTo = function(obj, other_type) {
    var type = Namespace.data.value.type(obj);
    if (Namespace.data.value.transformsTo(type, other_type)) {
        return true;
    }
    return false;
};

/* returns true if an object's own types or one layer connections can convert to a type, else false */
Namespace.data.value.transformsFrom = function(obj, other_type) {
    var type = Namespace.data.value.type(obj);
    if (Namespace.data.value.transformsFrom(type, other_type)) {
        return true;
    }
    return false;
};

/* returns an object converted to type */
Namespace.data.value.transform = function(obj, other_type) {
    var type = Namespace.data.value.type(obj);
    return Namespace.data.type.transform(type, other_type, obj);
};

/* returns type_id for an object or null if not set */
Namespace.data.value.type = function(obj) {
    //TODO: Implementation; also: how?
    return ('undefined' !== typeof obj.type) ? obj.type : null;
};

/* returns true if value is valid instance of type, else false */
Namespace.data.value.isType = function(obj, type) {
    if (type === Namespace.data.value.type(obj)) {
        return true;
    }
    return false;
};

/* returns true if an object can be validated for a type, else false. note that this is different than testing whether the type object can be validated (which is always true). */
Namespace.data.value.canValidate = function(obj) {
    var type = Namespace.data.value.type(obj);
    if (Namespace.data.type.canValidate(type)) {
        return Namespace.data.value.validate(obj, type);
    }
};

/* returns true if object can and does validate for a type, else false */
Namespace.data.value.validate = function(obj, type) {
    if (Namespace.data.value.canValidate(type)) {
        var typeobj = Namespace.data.type.get(type);
        if (typeobj.validate(obj)) {
            return true;
        }
    }
    return false;
};


/* Element Types */

Namespace.data.elements = {
    'table': {
        'validate': function() {}
    },
    'column': {
        'validate': function() {}
    },
    'row': {
        'validate': function() {}
    },
    'cell': {
        'validate': function() {}
    }
};

/* Chart Types */

Namespace.charts.types = {
    'bar': {
        'update*': function(target, table) {},
        'remove': function(target, table) {},

        'replace': function(target, table) {},
        'add': function(target, table) {}
    },
    'pie': {
        'update*': function(target, table) {},
        'remove': function(target, table) {},
        'replace': function(target, table) {},
        'add': function(target, table) {}
    },
    'line': {
        'update*': function(target, table) {},
        'remove': function(target, table) {},
        'replace': function(target, table) {},
        'add': function(target, table) {}
    }
};


/* Chart utilities */

Namespace.charts.add = function(type, target) {

};

Namespace.charts.type = function(target) {

};

Namespace.charts.exists = function(id) {

};

Namespace.charts.remove = function(id) {

};

//Create

/* returns a well formatted data object for data type or null if there was some sort of error. columns and rows are arrays of column and row objects, respectively.  */
Namespace.data.table.create = function( columns, rows, meta, timestamp ) {
	//columns are rows are required
	if( 'undefined' === typeof columns || 'undefined' === typeof rows ||  null === columns || null === rows ) {
		return null;	
	} else {
		//columns and rows are formatted as arrays in raw
		if( !Namespace.utils.isArray( columns ) || !Namespace.utils.isArray( rows ) {
			//columns and rows must be arrays
			return null;
		}
	}
	//meta is optional
	if( 'undefined' === typeof meta ) {
		meta = null;
	}
	//timestamp can be faked
	timestamp = ( 'number' !== typeof timestamp ) ? new Date().getTime() : timestamp;
	return { 
		'columns': columns
		, 'rows': rows
		, 'meta': meta
		, 'timestamp': timestamp
	};
};
Namespace.data.row.create = function( value, meta, timestamp ) {
	//value is required
	if( 'undefined' === typeof value || null === value ) {
		return null;	
	}
	//meta is optional
	if( 'undefined' === typeof meta ) {
		meta = null;
	}
	//timestamp can be faked
	timestamp = ( 'number' !== typeof timestamp ) ? new Date().getTime() : timestamp;
    	return { 
        	'value': value
		, 'meta': meta
       		, 'timestamp': timestamp
	};
};

/* type is required */
/* types: boolean, number, string, date, datetime */
Namespace.data.column.types = [ 'boolean', 'number', 'string', 'date', 'datetime' ];
Namespace.data.column.create = function( type, id, meta, timestamp ) {
	//type is required
	if( 'undefined' === typeof type ||  null === type ) {
		//no type given
		return null;
	} else {
		if( -1 === Namespace.data.column.types.indexOf( type ) ) {
			//not a valid type
			return null;
		}
	}
	//id is optional
	if( 'undefined' === typeof id || null === id ) {
		id = null;
	}
	//meta is optional
	if( 'undefined' === typeof meta || null === meta ) {
		meta = {};
	}
	if( 'undefined' === typeof meta.label ) {
		meta.label = null;
	}
	//timestamp can be faked
	timestamp = ( 'number' !== typeof timestamp ) ? new Date().getTime() : timestamp;
	return { 
		'type': type
		, 'id': id
    		, 'meta': meta
		, 'timestamp': timestamp
	};
};

Namespace.data.cell.create = function( value, meta, id, timestamp) {
	//value is required
	if( 'undefined' === typeof value || null === value ) {
		//no value given
		return null;
	}
	//id is optional
	if( 'undefined' === typeof id || null === id ) {
		id = null;
	}
	//meta is optional
	if( 'undefined' === typeof meta || null === meta ) {
		meta = {};
	}
	if( 'undefined' === typeof meta.label ) {
		meta.label = null;
	}

	//timestamp can be faked
	timestamp = ( 'number' !== typeof timestamp ) ? new Date().getTime() : timestamp;

	return { 
		'value': value
		, 'id': id
    		, 'meta': meta
		, 'timestamp': timestamp
	};
};
    
Namespace.data.table.add = function( table_id, table ) {
	//TODO: validate table
	if( 'undefined' === typeof Namespace.cache[ table_id ] ) {
		Namespace.cache[ table_id ] = table;
	} 
};

Namespace.data.row.add = function( table_id, row ) {
	//TODO: validate row 
	var table = Namespace.cache[ table_id ];
	if( 'undefined' !== typeof table ) {
		Namespace.cache[ table_id ].rows.push( row );
	};
};

Namespace.data.column.add = function( table_id, column ) {
	//TODO: validate column 
	var table = Namespace.cache[ table_id ];
	if( 'undefined' !== typeof table ) {
		Namespace.cache[ table_id ].columns.push( columns );
	};
};

//Can't update a cell without adding a row or column
//Namespace.data.cell.add = function() {};

//Read
Namespace.data.table.get = function( table_id ) {
	if( 'undefined' !== typeof Namespace.cache[ table_id ] ) {
		return Namespace.cache[ table_id ];
	} 
	return null;
};

//allows for optional lookup by row_id, in which case row_index is ignored and can be set to null
Namespace.data.row.get = function( table_id, row_index, row_id ) {
	var table = Namespace.cache[ table_id ]
	  , row;
	if( 'undefined' !== typeof table ) {
		if( 'undefined' !== typeof row_id ) {
			var rowlen = table.rows.length;
			for( var x = 0; x < rowlen; x += 1 ) {
				var tmp = table.rows[ x ];
				if( 'undefined' !== tmp.id ) {
					if( tmp.id === row_id ) {
						return;
					}
				}
			}
		} else {
			row = table.rows[ row_index ];
			if( 'undefined' !== typeof row ) {
				return row;
			}
		}
	} 
	return null;
};
Namespace.data.column.get = function( table_id, column_index, column_id) {
	var table = Namespace.cache[ table_id ]
	  , column;
	if( 'undefined' !== typeof table ) {
		if( 'undefined' !== typeof column_id ) {
			var collen = table.rows.length;
			for( var x = 0; x < collen; x += 1 ) {
				column = table.columns[ x ];
				if( 'undefined' !== columm.id ) {
					if( column.id === column_id ) {
						return column;
					}
				}
			}
		} else {
			column = table.columns[ column_index ];
			if( 'undefined' !== typeof column ) {
				return column;
			}
		}
	} 
	return null;
};

Namespace.data.cell.get = function( table_id, row_index, row_id, column_index, column_id ) {
	var table = Namespace.cache[ table_id ]
	  , column, row, value;
	if( 'undefined' !== typeof table ) {
		if( 'undefined' !== typeof row_id ) {
			var rowlen = table.rows.length;
			for( var x = 0; x < rowlen; x += 1 ) {
				var tmp = table.rows[ x ];
				if( 'undefined' !== tmp.id ) {
					if( tmp.id === row_id ) {
						row = tmp;
					}
				}
			}
		} else {
			row = table.rows[ row_index ];
		}
	} 
	if( 'undefined' !== typeof row ) {
		if( 'undefined' !== typeof column_id ) {
			var rowlen = table.rows.length;
			for( var x = 0; x < rowlen; x += 1 ) {
				var tmp = table.rows[ x ];
				if( 'undefined' !== tmp.id ) {
					if( tmp.id === column_id ) {
						value = tmp;
					}
				}
			}
		} else {
			value = row[ column_index ];
		}
	}
	return null;
};
//TODO: Next up?
//Destroy
Namespace.data.remove = function() {};
Namespace.data.table.remove = function() {};
Namespace.data.row.remove = function() {};
Namespace.data.column.remove = function() {};
Namespace.data.cell.remove = function() {};

//Replace
Namespace.data.put = function() {};
Namespace.data.table.put = function() {};
Namespace.data.row.put = function() {};
Namespace.data.column.put = function() {};
Namespace.data.cell.put = function() {};

//Update
Namespace.data.update = function(data, id, type, format, meta,parents,children) {

};

Namespace.data.table.update = function() {};
Namespace.data.row.update = function() {};
Namespace.data.column.update = function() {};
Namespace.data.cell.update = function() {};

Namespace.data.update.value = function() {};
Namespace.data.table.update.value = function() {};
Namespace.data.row.update.value = function() {};
Namespace.data.column.update.value = function() {};
Namespace.data.cell.update.value = function() {};

Namespace.data.update.id = function() {};
Namespace.data.table.update.id = function() {};
Namespace.data.row.update.id = function() {};
Namespace.data.column.update.id = function() {};
Namespace.data.cell.update.id = function() {};

Namespace.data.update.meta = function() {};
Namespace.data.table.update.meta = function() {};
Namespace.data.row.update.meta = function() {};
Namespace.data.column.update.meta = function() {};
Namespace.data.cell.update.meta = function() {};

Namespace.data.update.timestamp = function() {};
Namespace.data.table.update.timestamp = function() {};
Namespace.data.row.update.timestamp = function() {};
Namespace.data.column.update.timestamp = function() {};
Namespace.data.cell.update.timestamp = function() {};

//Draw
Namespace.data.draw = function() {};
Namespace.data.table.draw = function() {};
Namespace.data.row.draw = function() {};
Namespace.data.column.draw = function() {};
Namespace.data.cell.draw = function() {};

/* Utilities */

Namespace.utils.isArray = function(obj) {
    if (!obj.isArray) {
        return Object.prototype.toString.call(obj) == '[object Array]';
    } else {
        return obj.isArray();
    }
}

