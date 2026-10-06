#!/usr/bin/env node
// Release notes for @nativescript/tailwind, in the CHANGELOG.md format.
//
//   release-notes.mjs extract <version>
//     Prints the CHANGELOG.md section for <version> (without its heading); exits 1 if absent.
//
//   release-notes.mjs generate <version> [--from <ref>] [--to <ref>] [--write]
//     Builds the section from conventional commits in <from>..<to> (default: the
//     previous version tag..HEAD) and prints it; --write also prepends it to CHANGELOG.md.
//     Authors are credited by GitHub handle when `gh` can resolve them.
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';

const CHANGELOG = 'CHANGELOG.md';
const repo = process.env.GITHUB_REPOSITORY || 'NativeScript/tailwind';

const sections = [
	{ types: ['feat'], title: '🚀 Features' },
	{ types: ['fix'], title: '🩹 Fixes' },
	{ types: ['perf'], title: '🔥 Performance' },
];

function run(cmd, args) {
	return execFileSync(cmd, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
}

function extract(version) {
	const lines = readFileSync(CHANGELOG, 'utf8').split('\n');
	const start = lines.findIndex((line) => line.startsWith(`## ${version} `) || line === `## ${version}`);
	if (start === -1) return null;
	const end = lines.findIndex((line, i) => i > start && line.startsWith('## '));
	return lines
		.slice(start + 1, end === -1 ? undefined : end)
		.join('\n')
		.trim();
}

function previousTag(version, ref) {
	// Version tags are bare (4.1.0); the old v-prefixed tags predate this changelog.
	return run('git', ['describe', '--tags', '--abbrev=0', '--match', '[0-9]*', '--exclude', version, ref]);
}

const handles = new Map();
function githubHandle(sha) {
	try {
		return run('gh', ['api', `repos/${repo}/commits/${sha}`, '--jq', '.author.login // empty']) || null;
	} catch {
		return null;
	}
}

function generate(version, from, to) {
	const range = `${from ?? previousTag(version, to)}..${to}`;
	const log = run('git', ['log', '--no-merges', '--format=%H%x1f%an%x1f%s', range]);
	const entries = new Map(sections.map((section) => [section, []]));
	const breaking = [];
	const authors = new Map();

	for (const line of log ? log.split('\n') : []) {
		const [sha, author, subject] = line.split('\x1f');
		const match = subject.match(/^(\w+)(?:\(([^)]+)\))?(!)?: (.+)$/);
		if (!match) continue;
		const [, type, scope, bang, rawText] = match;
		const section = sections.find((s) => s.types.includes(type));
		if (!section && !bang) continue;

		const pr = rawText.match(/\s*\(#(\d+)\)$/);
		const text = pr ? rawText.slice(0, pr.index) : rawText;
		const link = pr ? `[#${pr[1]}](https://github.com/${repo}/pull/${pr[1]})` : `[${sha.slice(0, 7)}](https://github.com/${repo}/commit/${sha})`;
		const entry = `- ${scope ? `**${scope}:** ` : ''}${text} (${link})`;

		if (section) entries.get(section).push(entry);
		if (bang) breaking.push(entry);
		if (!authors.has(author)) {
			if (!handles.has(author)) handles.set(author, githubHandle(sha));
			authors.set(author, handles.get(author));
		}
	}

	const parts = [];
	for (const [section, list] of entries) {
		if (list.length) parts.push(`### ${section.title}\n\n${list.join('\n')}`);
	}
	if (breaking.length) parts.push(`### ⚠️ Breaking Changes\n\n${breaking.join('\n')}`);
	if (!parts.length) parts.push('No user-facing changes.');
	if (authors.size) {
		const names = [...authors]
			.sort(([a], [b]) => a.localeCompare(b))
			.map(([name, handle]) => `- ${name}${handle ? ` @${handle}` : ''}`);
		parts.push(`### ❤️ Thank You\n\n${names.join('\n')}`);
	}
	return parts.join('\n\n');
}

const [command, version, ...rest] = process.argv.slice(2);
const option = (name) => {
	const i = rest.indexOf(name);
	return i === -1 ? undefined : rest[i + 1];
};

if (!version || !['extract', 'generate'].includes(command)) {
	console.error('usage: release-notes.mjs extract <version> | generate <version> [--from <ref>] [--to <ref>] [--write]');
	process.exit(2);
}

if (command === 'extract') {
	const notes = extract(version);
	if (notes === null) {
		console.error(`No CHANGELOG.md section for ${version}.`);
		process.exit(1);
	}
	console.log(notes);
} else {
	const notes = generate(version, option('--from'), option('--to') ?? 'HEAD');
	if (rest.includes('--write')) {
		const date = new Date().toISOString().slice(0, 10);
		writeFileSync(CHANGELOG, `## ${version} (${date})\n\n${notes}\n\n${readFileSync(CHANGELOG, 'utf8')}`);
	}
	console.log(notes);
}
