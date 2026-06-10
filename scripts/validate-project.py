#!/usr/bin/env python3
"""
Project validation script - validates project structure and configuration.
"""
import sys
import json
from pathlib import Path


def validate_project() -> dict:
    """Validate project structure."""
    workspace = Path(__file__).parent.parent
    issues = []
    
    # Check required directories
    required_dirs = ["src", "tests", "docs", "config", "scripts", "references", "migrations"]
    for dir_name in required_dirs:
        if not (workspace / dir_name).exists():
            issues.append(f"Missing required directory: {dir_name}")
    
    # Check required files
    required_files = ["README.md", "CHANGELOG.md", "TODO.md", ".gitignore", "VERSION"]
    for file_name in required_files:
        if not (workspace / file_name).exists():
            issues.append(f"Missing required file: {file_name}")
    
    return {
        "valid": len(issues) == 0,
        "issues": issues,
        "workspace": str(workspace)
    }


if __name__ == "__main__":
    result = validate_project()
    if result["valid"]:
        print("✓ Project validation passed")
        sys.exit(0)
    else:
        print("✗ Project validation failed:")
        for issue in result["issues"]:
            print(f"  - {issue}")
        sys.exit(1)