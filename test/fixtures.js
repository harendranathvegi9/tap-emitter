import path from 'path';
import {EventEmitter} from 'events';
import fs from 'fs';
import test from 'ava';
import atoe from 'array-to-events';
import disparity from 'disparity';
import Messages from '../lib/messages';

function loadFixture(name) {
	return fs.readFileSync(path.join(__dirname, 'fixtures', name), 'utf8');
}

function tryLoad(...args) {
	for (var i = 0; i < args.length; i++) {
		try {
			return loadFixture(args[i]);
		} catch (err) {}
	}

	throw new Error('found none of these: ' + args.join(', '));
}

function processEvents(events, lines, indent, opts) {
	const ee = new EventEmitter();
	const messages = new Messages(13, indent);

	ee.on('version', () => lines.push(messages.version()));
	ee.on('plan', plan => lines.push(messages.plan(plan.end)));
	ee.on('bailout', message => lines.push(messages.bailout(message)));
	ee.on('comment', comment => lines.push(messages.diagnostic(comment.replace(/\n$/, '').replace(/^\s*#\s*/, ''))));
	ee.on('child', events => processEvents(events, lines, indent + 4, opts));
	ee.on('assert', assert => {
		const def = {
			ok: assert.ok,
			description: assert.name
		};

		if (opts.id !== false) {
			def.testNumber = assert.id;
		}

		if (assert.time) {
			def.directive = 'time=' + assert.time + 'ms';
		}

		if (assert.skip) {
			def.directive = 'Skip ' + assert.skip;
		}

		if (assert.todo) {
			def.directive = assert.todo === true ? 'TODO' : 'TODO ' + assert.todo;
		}

		lines.push(messages.test(def));

		if (assert.diag) {
			lines.push(messages.yaml(assert.diag));
		}
	});

	atoe(ee, events);
}

function runTest(name, opts) {
	opts = opts || {};

	(opts.debug ? test.only : test)(name, t => {
		const events = JSON.parse(loadFixture(name + '.json'));
		const expected = tryLoad(name + '.tap-out', name + '.tap').trim();
		const lines = [];
		processEvents(events, lines, 0, opts);

		const output = lines.join('\n').trim();

		if (opts.debug) {
			console.log(output);

			if (output !== expected) {
				console.log(disparity.unified(expected, output));
			}
		} else {
			t.is(output, expected);
		}
	});
}

runTest('bailout');
runTest('basic', {id: false});
runTest('bignum');
runTest('bignum_many');
runTest('broken-yamlish-looks-like-child');
runTest('child-extra');
runTest('combined');
runTest('combined_compat');
runTest('comment-mid-diag');
runTest('comment-mid-diag-postplan');
runTest('common-with-explanation');
runTest('creative-liberties');
runTest('delayed');
runTest('descriptive');
runTest('descriptive_trailing');
runTest('die_head_end');
runTest('die_last_minute');
runTest('die_unfinished');
runTest('duplicates');
runTest('echo');
runTest('empty');
runTest('escape_eol');
runTest('escape_hash');
runTest('extra-in-child');
runTest('garbage-yamlish');
runTest('giving-up');
runTest('got-spare-tuits');
runTest('head_end');
runTest('head_fail');
runTest('implicit-counter', {id: false});
runTest('indent');
runTest('indented-stdout-noise');
runTest('junk_before_plan');
runTest('line-break');
runTest('simple_yaml');
