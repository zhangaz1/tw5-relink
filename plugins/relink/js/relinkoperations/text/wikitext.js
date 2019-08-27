/*\

Checks for fromTitle in a tiddler's text. If found, sees if it's relevant,
and tries to swap it out if it is.

\*/

/*jslint node: false, browser: true */
/*global $tw: false */
"use strict";

var type = 'text/vnd.tiddlywiki';
var WikiParser = require("$:/core/modules/parsers/wikiparser/wikiparser.js")[type];

var rules = Object.create(null);
$tw.modules.applyMethods('relinkwikitextrule', rules);

function WikiRelinker(text, toTitle, options) {
	WikiParser.call(this, null, text, options);
	this.toTitle = toTitle;
	this.inlineRules = this.blockRules.concat(this.pragmaRules, this.inlineRules);
	// We work through relinkRules so we can change it later.
	// relinkRules is inlineRules so it gets touched up by amendRules().
	this.relinkRules = this.inlineRules;
	this.placeholders = Object.create(null);
	this.reverseMap = Object.create(null);
	this.knownMacros = Object.create(null);
};

WikiRelinker.prototype = Object.create(WikiParser.prototype);
WikiRelinker.prototype.parsePragmas = function() {return []; };
WikiRelinker.prototype.parseInlineRun = function() {};
WikiRelinker.prototype.parseBlocks = function() {};

WikiRelinker.prototype.getPlaceholderFor = function(value, category) {
	var placeholder = this.reverseMap[value];
	if (placeholder) {
		return placeholder;
	}
	var number = 0;
	var prefix = "relink-"
	if (category) {
		prefix += category + "-";
	}
	do {
		number += 1;
		placeholder = prefix + number;
	} while (this.knownMacros[placeholder]);
	this.placeholders[placeholder] = value;
	this.reverseMap[value] = placeholder;
	this.reserve(placeholder);
	return placeholder;
};

WikiRelinker.prototype.reserve = function(macro) {
	this.knownMacros[macro] = true;
};

WikiRelinker.prototype.getPreamble = function() {
	var results = [];
	for (var name in this.placeholders) {
		var val = this.placeholders[name];
		results.push(`\\define ${name}() ${val}\n`);
	}
	if (results.length > 0) {
		return results.join('');
	} else {
		return undefined;
	}
};

exports[type] = function(tiddler, fromTitle, toTitle, changes, options) {
	var text = tiddler.fields.text,
		builder = [],
		buildIndex = 0,
		parser = new WikiRelinker(text, toTitle, options),
		matchingRule;
	while (matchingRule = parser.findNextMatch(parser.relinkRules, parser.pos)) {
		var name = matchingRule.rule.name;
		if (rules[name]) {
			var newSegment = rules[name].call(matchingRule.rule, tiddler, text, fromTitle, toTitle, options);
			if (newSegment !== undefined) {
				builder.push(text.substring(buildIndex, matchingRule.matchIndex));
				builder.push(newSegment);
				buildIndex = parser.pos;
			}
		} else {
			if (matchingRule.rule.matchRegExp !== undefined) {
				parser.pos = matchingRule.rule.matchRegExp.lastIndex;
			} else {
				// We can't easily determine the end of this
				// rule match. We'll "parse" it so that
				// parser.pos gets updated, but we throw away
				// the results.
				matchingRule.rule.parse();
			}
		}
	}
	if (builder.length > 0) {
		var preamble = parser.getPreamble();
		if (preamble) {
			builder.unshift(preamble);
		}
		builder.push(text.substr(buildIndex));
		changes.text = builder.join('');
	}
};
