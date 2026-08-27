#!/usr/bin/env node
// Runs a command with a deterministic PORT derived from the current git branch
// when executed inside a linked git worktree, so parallel worktrees never
// collide on the same dev port. In the main checkout (or when PORT is already
// set in the environment) the default port is used.
//
// Usage: node scripts/with-port.mjs <command> [...args]
//   - exports the resolved PORT to the child process (picked up by the Vite
//     config via process.env.PORT)
//   - substitutes the literal token `{PORT}` in any argument with the resolved port
//   - in a linked worktree, also exports VITE_BACKEND_WS_URL pointing at the
//     backend port derived from the same branch (same hash, base :30008), so
//     the UI talks to the worktree's own backend; an explicit VITE_BACKEND_WS_URL
//     env var always wins
//
// Examples:
//   node scripts/with-port.mjs vite

import { execFileSync, spawn } from 'node:child_process';
import { createHash } from 'node:crypto';

const DEFAULT_PORT = '7085';
const BACKEND_DEFAULT_PORT = '30008';

function git(...args) {
    // stderr is ignored: callers treat a non-zero exit (e.g. not a repo) as "no worktree".
    return execFileSync('git', args, {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
}

// A linked worktree's git-dir lives under <common>/worktrees/<name>, so it
// differs from the common dir. In the main checkout the two are identical.
function isLinkedWorktree() {
    try {
        return (
            git('rev-parse', '--git-dir') !==
            git('rev-parse', '--git-common-dir')
        );
    } catch {
        return false;
    }
}

// Deterministic port in <base>+1..<base>+999 (close to the default, never collides with it).
function portForBase(base, branch) {
    const offset =
        createHash('sha1').update(branch).digest().readUInt32BE(0) % 999;
    return String(Number(base) + 1 + offset);
}

function resolvePort() {
    if (process.env.PORT) return { port: process.env.PORT, source: 'env' };
    if (isLinkedWorktree()) {
        const branch = git('rev-parse', '--abbrev-ref', 'HEAD');
        return {
            port: portForBase(DEFAULT_PORT, branch),
            backendUrl: `localhost:${portForBase(BACKEND_DEFAULT_PORT, branch)}`,
            source: 'worktree',
            branch,
        };
    }
    return { port: DEFAULT_PORT, source: 'default' };
}

const [cmd, ...rawArgs] = process.argv.slice(2);
if (!cmd) {
    console.error('with-port: missing command to run');
    process.exit(1);
}

const { port, backendUrl, source, branch } = resolvePort();
const args = rawArgs.map((arg) => arg.replaceAll('{PORT}', port));

const env = { ...process.env, PORT: port };
if (source === 'worktree') {
    if (!process.env.VITE_BACKEND_WS_URL) env.VITE_BACKEND_WS_URL = backendUrl;
    console.error(
        `[with-port] worktree '${branch}' → PORT=${port}, VITE_BACKEND_WS_URL=${env.VITE_BACKEND_WS_URL}`
    );
}

// `shell` is only needed on Windows (to launch `vite.cmd`);
// on POSIX it resolves the binary via PATH directly, avoiding shell-init noise.
const child = spawn(cmd, args, {
    stdio: 'inherit',
    env,
    shell: process.platform === 'win32',
});
child.on('exit', (code, signal) => {
    process.exit(code ?? (signal ? 1 : 0));
});