import subprocess
print(subprocess.check_output("grep -rnw -A 2 -B 2 'serverFunctions' src/client", shell=True).decode('utf-8'))
