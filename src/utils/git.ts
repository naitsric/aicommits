import { execa } from 'execa';
import { KnownError } from './error.js';
import * as console from "console";

export const assertGitRepo = async () => {
	const { stdout, failed } = await execa('git', ['rev-parse', '--show-toplevel'], { reject: false });

	if (failed) {
		throw new KnownError('The current directory must be a Git repository!');
	}

	return stdout;
};

const excludeFromDiff = (path: string) => `:(exclude)${path}`;

const filesToExclude = [
	'package-lock.json',
	'pnpm-lock.yaml',

	// yarn.lock, Cargo.lock, Gemfile.lock, Pipfile.lock, etc.
	'*.lock',
].map(excludeFromDiff);

export const getStagedDiff = async (excludeFiles?: string[]) => {
	const diffCached = ['diff', '--cached', '--diff-algorithm=minimal'];
	const { stdout: files } = await execa(
		'git',
		[
			...diffCached,
			'--name-only',
			...filesToExclude,
			...(
				excludeFiles
					? excludeFiles.map(excludeFromDiff)
					: []
			),
		],
	);

	if (!files) {
		return;
	}

	const { stdout: diff } = await execa(
		'git',
		[
			...diffCached,
			...filesToExclude,
			...(
				excludeFiles
					? excludeFiles.map(excludeFromDiff)
					: []
			),
		],
	);

	return {
		files: files.split('\n'),
		diff,
	};
};

type ResultBranchDiff = {
	files: string[];
	prop2: string[];
};

export const getBranchDiff = async (
	frombranch: string, tobranch: string, excludeFiles?: string[],
) =>  {
	const diffCached = ['diff', frombranch, tobranch, '--diff-algorithm=minimal'];
	const { stdout: files } = await execa(
		'git',
		[
			...diffCached,
			'--name-only',
			...filesToExclude,
			...(
				excludeFiles
					? excludeFiles.map(excludeFromDiff)
					: []
			),
		],
	);

	if (!files) {
		return;
	}
	const _files =  files.split('\n');
	let _diff: string[] = [];


	for(const file of _files) {
		let { diff } = await getBranchDiffPerFile(frombranch, tobranch, file, excludeFiles);
		_diff.push(diff);
	}

	return {
		files: _files,
		diff: _diff,
	};
};

export const getBranchDiffPerFile = async (
	frombranch: string, tobranch: string, file: string, excludeFiles?: string[],
) => {
	const diffCached = ['diff', `${frombranch}..${tobranch}`, '--diff-algorithm=minimal', '--', file];

	const { stdout: diff } = await execa(
		'git',
		[
			...diffCached,
			...filesToExclude,
			...(
				excludeFiles
					? excludeFiles.map(excludeFromDiff)
					: []
			),
		],
	);
	return {
		diff,
	};
};

export const getDetectedMessage = (files: string[]) => `Detected ${files.length.toLocaleString()} staged file${files.length > 1 ? 's' : ''}`;
