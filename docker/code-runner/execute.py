import json
import os
import resource
import subprocess
import sys
import time

LIMIT = 64000
WORK = '/work'
# Compilation gets its own budget. Sharing the challenge's runtime limit meant a
# correct C++/Java/Go/Rust/TS solution was reported as a timeout whenever
# timeLimitMs was below a realistic compile time (the admin default is 2000ms).
COMPILE_TIMEOUT_SECONDS = 20.0
# Exit codes the kernel/cgroup uses when a process is killed for exceeding a
# memory cgroup limit (SIGKILL => 128+9).
OOM_EXIT_CODES = {-9, 137}

BASE_ENV = {
    'PATH': '/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:/usr/local/go/bin',
    'HOME': WORK,
    'LANG': 'C.UTF-8',
}

GO_ENV = {**BASE_ENV, 'GO111MODULE': 'off', 'GOPATH': '/tmp/go', 'GOCACHE': '/tmp/gocache'}
NODE_ENV = {**BASE_ENV, 'NODE_PATH': '/usr/lib/node_modules'}


def clip(value):
    return (value or '')[:LIMIT]


def response(status, started, compiler='', output=''):
    usage = resource.getrusage(resource.RUSAGE_CHILDREN)
    elapsed = round((time.monotonic() - started) * 1000)
    print(json.dumps({
        'status': status,
        'executionTimeMs': elapsed,
        'memoryUsedKb': usage.ru_maxrss or None,
        'compilerOutput': clip(compiler) or None,
        'runtimeOutput': clip(output) or None,
    }))


def run(command, stdin, timeout, env=None):
    return subprocess.run(
        command,
        cwd=WORK,
        input=stdin,
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        timeout=timeout,
        env=env or BASE_ENV,
    )


def main():
    started = time.monotonic()
    try:
        request = json.load(sys.stdin)
        language = request['language']
        source = request['sourceCode']
        timeout = max(0.05, request['timeLimitMs'] / 1000)
        input_value = request['input']

        definitions = {
            'PYTHON': (
                'main.py',
                ['python3', 'main.py'],
                None,
                BASE_ENV,
            ),
            'JAVASCRIPT': (
                'main.js',
                ['node', 'main.js'],
                None,
                NODE_ENV,
            ),
            'TYPESCRIPT': (
                'main.ts',
                ['node', 'out/main.js'],
                ['tsc', '--target', 'ES2022', '--module', 'commonjs',
                 '--moduleResolution', 'node', '--outDir', 'out', 'main.ts'],
                NODE_ENV,
            ),
            'CPP': (
                'main.cpp',
                ['./main'],
                ['g++', '-std=c++20', '-O2', '-o', 'main', 'main.cpp'],
                BASE_ENV,
            ),
            'GO': (
                'main.go',
                ['./main'],
                ['go', 'build', '-o', 'main', 'main.go'],
                GO_ENV,
            ),
            'RUST': (
                'main.rs',
                ['./main'],
                ['rustc', '-O', '-o', 'main', 'main.rs'],
                BASE_ENV,
            ),
            'JAVA': (
                'Main.java',
                ['java', '-cp', '.', 'Main'],
                ['javac', 'Main.java'],
                BASE_ENV,
            ),
        }

        filename, command, compile_command, run_env = definitions[language]

        with open(os.path.join(WORK, filename), 'w', encoding='utf-8') as source_file:
            source_file.write(source)

        if compile_command:
            try:
                compiled = run(compile_command, '', COMPILE_TIMEOUT_SECONDS, env=run_env)
            except subprocess.TimeoutExpired:
                response(
                    'COMPILATION_ERROR',
                    started,
                    f'Compilation exceeded {COMPILE_TIMEOUT_SECONDS:.0f}s and was stopped.',
                )
                return
            if compiled.returncode in OOM_EXIT_CODES:
                response('MEMORY_LIMIT_EXCEEDED', started, 'The compiler ran out of memory.')
                return
            if compiled.returncode != 0:
                response('COMPILATION_ERROR', started, compiled.stderr or compiled.stdout)
                return

        executed = run(command, input_value, timeout, env=run_env)
        if executed.returncode in OOM_EXIT_CODES:
            # A cgroup OOM kill surfaces as a non-zero exit, not a MemoryError in
            # this interpreter, so without this the player saw RUNTIME_ERROR.
            response('MEMORY_LIMIT_EXCEEDED', started, '', executed.stderr or executed.stdout)
            return
        if executed.returncode != 0:
            response('RUNTIME_ERROR', started, '', executed.stderr or executed.stdout)
            return

        response('EXECUTED', started, '', executed.stdout)

    except subprocess.TimeoutExpired:
        response('TIME_LIMIT_EXCEEDED', started)
    except MemoryError:
        response('MEMORY_LIMIT_EXCEEDED', started)
    except Exception as error:
        response('INTERNAL_ERROR', started, str(error))


if __name__ == '__main__':
    main()
