#!/usr/bin/env python3
"""
Dependency check script - validates dependencies are properly declared.
"""
import sys
import json
from pathlib import Path


def check_dependencies() -> dict:
    """Check project dependencies."""
    workspace = Path(__file__).parent.parent
    issues = []
    
    # Check package.json exists
    package_json = workspace / "package.json"
    if not package_json.exists():
        issues.append("Missing package.json")
    else:
        try:
            with open(package_json) as f:
                pkg = json.load(f)
            if "dependencies" not in pkg and "devDependencies" not in pkg:
                issues.append("package.json missing dependencies")
        except json.JSONDecodeError:
            issues.append("Invalid package.json")
    
    # Check for lock file
    if not (workspace / "package-lock.json").exists() and not (workspace / "yarn.lock").exists() and not (workspace / "pnpm-lock.yaml").exists():
        issues.append("Missing lock file (package-lock.json, yarn.lock, or pnpm-lock.yaml)")
    
    return {
        "valid": len(issues) == 0,
        "issues": issues,
        "workspace": str(workspace)
    }


if __name__ == "__main__":
    result = check_dependencies()
    if result["valid"]:
        print("✓ Dependency check passed")
        sys.exit(0)
    else:
        print("✗ Dependency check failed:")
        for issue in result["issues"]:
            print(f"  - {issue}")
        sys.exit(1)