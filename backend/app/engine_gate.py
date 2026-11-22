"""Wait for the supervisor to attach resource limits before launching a tool."""

import os
import subprocess
import sys


if __name__ == "__main__":
    if sys.stdin.buffer.read(1) != b"G":
        sys.exit(125)
    if os.name != "nt":
        import resource

        cpu, memory, output = (int(value) for value in sys.argv[1:4])
        resource.setrlimit(resource.RLIMIT_CPU, (cpu, cpu))
        resource.setrlimit(resource.RLIMIT_AS, (memory, memory))
        resource.setrlimit(resource.RLIMIT_FSIZE, (output, output))
        os.execv(sys.argv[4], sys.argv[4:])
    sys.exit(subprocess.call(sys.argv[4:], stdin=subprocess.DEVNULL, shell=False))
