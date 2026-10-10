import sqlite3
import shutil
import os
import sys
import tempfile

# Determine paths portably
script_dir = os.path.dirname(os.path.abspath(__file__))
repo_root = os.path.abspath(os.path.join(script_dir, "..", ".."))
src = os.path.abspath(os.path.join(repo_root, "backend", "agentic_os.db"))

default_dst = os.path.join(tempfile.gettempdir(), "agentic_os_phase_d_isolated.db")
dst = os.path.abspath(os.environ.get("PHASE_D_TEST_DB", default_dst))

# Hard Safety Gate: strictly abort if destination ever points to development database
assert os.path.abspath(dst) != src, "CRITICAL ERROR: Destination path cannot be the development database!"
assert not dst.endswith("backend/agentic_os.db") and not dst.endswith("backend\\agentic_os.db"), \
    "CRITICAL ERROR: Destination must not be backend/agentic_os.db!"

# Create parent directory if needed
os.makedirs(os.path.dirname(dst), exist_ok=True)

# Copy baseline database to isolated location
shutil.copy2(src, dst)

conn = sqlite3.connect(dst)
c = conn.cursor()

# Set up Mission 1 (8659b6b5)
c.execute("UPDATE tasks SET status = 'RUNNING' WHERE id = '7c1f2bb8-e48e-4d6d-89ce-a2aa4583f425'")
c.execute("UPDATE tasks SET status = 'READY' WHERE id = '864bbfe6-b732-4359-bfcc-ba0872bbe077'")

# Set up Mission 2 (5bd4e2ce)
c.execute("UPDATE tasks SET status = 'RUNNING' WHERE id = '22f6f082-c1de-41dd-97d5-5621450f0aeb'")
c.execute("UPDATE tasks SET status = 'READY' WHERE id = '01becb5e-d2fb-4c1d-888b-83fef03e641a'")

# Set up Mission 3 (6dbe84b8)
# Task 1 (aba78d65): FAILED
c.execute("UPDATE tasks SET status = 'FAILED' WHERE id = 'aba78d65-8a02-40a8-9726-b15d4d8d4b9f'")
# Task 2 (c1aa687a): RUNNING (to test RUNNING -> WAITING_APPROVAL)
c.execute("UPDATE tasks SET status = 'RUNNING' WHERE id = 'c1aa687a-3181-4c62-a720-632dcd7c4d90'")

conn.commit()
conn.close()
print(f"Isolated DB reset successfully at {dst}.")
