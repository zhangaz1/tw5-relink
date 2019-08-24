/*\

Handles replacement in attributes of widgets and html elements
This is configurable to select exactly which attributes of which elements
should be changed.

<$link to="TiddlerTitle" />

\*/

var html = require("$:/core/modules/parsers/wikiparser/rules/html.js");
var settings = require('$:/plugins/flibbles/relink/js/settings.js');

exports['html'] = function(tiddler, text, fromTitle, toTitle, options, state) {
	var managedElement = settings.getAttributes(options)[this.nextTag.tag],
		builder = [],
		buildIndex = this.nextTag.start;
	if (managedElement) {
		for (var attributeName in this.nextTag.attributes) {
			var attrRelinker = managedElement[attributeName];
			if (!attrRelinker) {
				continue;
			}
			var attr = this.nextTag.attributes[attributeName];
			var nextEql = text.indexOf('=', attr.start);
			// This is the rare case of changing tiddler
			// "true" to something else when "true" is
			// implicit, like <$link to /> We ignore those.
			if (nextEql < 0 || nextEql > attr.end) {
				continue;
			}
			var handler = new AttributeHandler(tiddler, attr.value);
			var value = attrRelinker(handler, fromTitle, toTitle, options);
			if (value === undefined) {
				continue;
			}
			var quote = determineQuote(text, attr);
			// account for the quote if it's there.
			var valueStart = attr.end
			               - (quote.length*2)
			               - attr.value.length;
			builder.push(text.substring(buildIndex, valueStart));
			var quotedValue = wrapValue(value, quote);
			if (quotedValue !== undefined) {
				builder.push(quotedValue);
			} else {
				// The value was unquotable. We need to make
				// a macro in order to replace it.
				var holder = state.getPlaceholderFor(value);
				builder.push("<<", holder, ">>");
			}
			buildIndex = valueStart
			           + attr.value.length
			           + (quote.length*2);
		}
	}
	this.parser.pos = this.nextTag.end;
	if (builder.length > 0) {
		builder.push(text.substring(buildIndex, this.nextTag.end));
		return builder.join('');
	}
	return undefined;
};

/**Givin some text, and an attribute within that text, this returns
 * what type of quotation that attribute is using.
 */
function determineQuote(text, attr) {
	var pos = attr.end-1;
	if (text.startsWith("'", pos)) {
		return "'";
	}
	if (text.startsWith('"', pos)) {
		if (text.startsWith('"""', pos-2)) {
			return '"""';
		} else {
			return '"';
		}
	}
	return '';
};

/**Tiddlywiki doesn't have escape characters for attribute values. Instead,
 * we just have to find the type of quotes that'll work for the given title.
 * There exist titles that simply can't be quoted.
 * If it can stick with the preference, it will.
 */
function wrapValue(value, preference) {
	var choices = {
		"": function(v) {return !/([\/\s<>"'=])/.test(value); },
		"'": function(v) {return v.indexOf("'") < 0; },
		'"': function(v) {return v.indexOf('"') < 0; },
		'"""': function(v) {return v.indexOf('"""') < 0 && v[v.length-1] != '"';}
	};
	if (choices[preference]) {
		if (choices[preference](value)) {
			return preference + value + preference;
		}
	}
	for (var quote in choices) {
		if (choices[quote](value)) {
			return quote + value + quote;
		}
	}
	// No quotes will work on this
	return undefined;
};

function AttributeHandler(tiddler, value) {
	this.tiddler = tiddler;
	this._value = value;
};

AttributeHandler.prototype.log = function(adjective, from, to) {
	console.log(`Renaming attribute ${adjective} '${from}' to '${to}' of tiddler '${this.tiddler.fields.title}'`);
};

AttributeHandler.prototype.value = function() {
	return this._value;
};
