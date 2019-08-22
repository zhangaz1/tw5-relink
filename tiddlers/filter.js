/*\
tags: $:/tags/test-spec
title: test/filter.js
type: application/javascript
module-type: test.relink

Tests the new relinking wiki methods.

\*/

var utils = require("test/utils");
var relink = utils.relink;

describe("filter fields", function() {

function operatorConf(operator, value) {
	if (value === undefined) {
		value = "yes";
	}
	var prefix = "$:/config/flibbles/relink/operators/";
	return {title: prefix + operator, text: value};
}

function testFilter(filter, expected, options) {
	[filter, expected, options] = utils.prepArgs(filter, expected, options);
	var title = "$:/config/flibbles/relink/fields/customFilter";
	options.wiki.addTiddlers([
		{title: title, text: "filter"},
		operatorConf("title"),
		operatorConf("tag")
	]);
	var t = relink({customFilter: filter}, options);
	expect(t.fields.customFilter).toBe(expected);
};

it('relinks and logs', function() {
	var log = [];
	testFilter("A [[from here]] B", {log: log});
	expect(log).toEqual(["Renaming customFilter operand 'from here' to 'to there' of tiddler 'test'"]);
});

it('quotes', function() {
	testFilter("A 'from here' B");
	testFilter('A "from here" B');
});

it('nonquotes', function() {
	testFilter("A from B", "A to B", {from: 'from', to: 'to'});
});

it('keeps brackets', function() {
	testFilter("A [[from]] B", "A [[to]] B", {from: 'from', to: 'to'});
});

it('added spaces', function() {
	testFilter("A from B", "A [[to there]] B",{from: 'from'});
	testFilter("from", "[[to there]]",{from: 'from'});
});

it('removed spaces', function() {
	testFilter("A [[from here]] B", "A to B",{to: 'to'});
	testFilter("A [[from here]]B", "A [[to]]B",{to: 'to'});
	testFilter("A[[from here]] B", "A[[to]] B",{to: 'to'});
	testFilter("[[from here]] B", "to B",{to: 'to'});
	testFilter("A [[from here]]", "A to",{to: 'to'});
	testFilter("[[from here]]", "to",{to: 'to'});
});

it('multiples', function() {
	testFilter("A [[f]] f B", 'A [[to there]] [[to there]] B', {from: "f"});
});

it('runs', function() {
	testFilter("[get[a][a]has[a]]", '[get[a][to there]has[a]]',
	           {from: "a"});
});

it('title operator', function() {
	testFilter("A [title[from here]] B");
	testFilter("A [title[from]] B", {from: 'from'});
});

it('ignores other operators', function() {
	testFilter("A [has[from here]] B", {ignored: true});
	testFilter("A [field:other[from here]] B", {ignored: true});
});

it('ignores variables', function() {
	testFilter("A [title<from>] B", {ignored: true, from: "from"});
	testFilter("A [<from>] B", {ignored: true, from: "from"});
});

it('ignores regular expressions', function() {
	testFilter("[regexp/rxp/] [[from here]] B");
	testFilter("A [title/from/] B", {ignored: true, from: "from"});
});

// In theory, we could have support for this, but not now.
it('ignores transclusion', function() {
	testFilter("A [title{from}] B", {ignored: true, from: "from"});
	testFilter("A [{from}] B", {ignored: true, from: "from"});
});

it('field:title operator', function() {
	testFilter("A [field:title[from here]] B");
});

it('tag operator', function() {
	testFilter("A [tag[from here]] B");
});

it('ignores blank tag configurations', function() {
	var wiki = new $tw.Wiki();
	wiki.addTiddler(operatorConf("empty", ""));
	testFilter("[[A]] [empty[A]]", "[[to there]] [empty[A]]", {from: "A", wiki: wiki});
});

it('ignores non-yes tag configurations', function() {
	var wiki = new $tw.Wiki();
	wiki.addTiddler(operatorConf("bad", "eh?"));
	testFilter("[[A]] [bad[A]]", "[[to there]] [bad[A]]", {from: "A", wiki: wiki});
});

});