# email-remittance-pro

**Type:** `Backend API / Service` | **Enterprise Grade** | **Initialized:** 2026-06-10 05:25:41

## Tech Stack Tags

`enterprise` `modular` `security-hardened` `gitignore-standardized` `todo-driven` `zero-placeholders` `self-validating` `changelog-enforced` `rollback-ready` `phase-tagged` `version-controlled` `git-managed` `semver`

## Quick Start

```bash
# Validate workspace compliance
python3 scripts/enterprise-org.py validate --workspace .

# Enforce standards (with auto-fix)
python3 scripts/enterprise-org.py enforce --workspace . --fix

# Full audit with report
python3 scripts/enterprise-org.py audit --workspace . --report audit-report.json

# Add CHANGELOG entry
python3 scripts/enterprise-org.py changelog --phase "initial-setup" --author "system" --reason "Enterprise organization initialized" --method "enterprise-org.py init" --validation "structure/security/todo/placeholder/self validation passed"

# Phase management
python3 scripts/enterprise-org.py phase --action start --phase "development" --no-commit
python3 scripts/enterprise-org.py phase --action complete --phase "development" --summary "Completed dev phase"

# Version management
python3 scripts/enterprise-org.py version --action bump --bump-type patch
python3 scripts/enterprise-org.py version --action release --version-arg 1.0.0 --push

# Git operations
python3 scripts/enterprise-org.py git --git-action status
python3 scripts/enterprise-org.py git --git-action commit --commit-message "feat: add feature"
python3 scripts/enterprise-org.py git --git-action push --remote origin --branch main

# Full release
python3 scripts/enterprise-org.py release --bump patch --release-message "Patch release"
```

## File Tree Structure

```
email-remittance-pro/
├── .github/
│   └── workflows/            # CI/CD pipelines
├── config/                   # Configuration files
├── docs/                     # Documentation
├── references/               # Deep technical references
├── scripts/                  # Build, deploy, utility scripts
├── src/                      # Source code
├── tests/                    # Test suites
├── .gitignore                # Enterprise gitignore
├── README.md                 # This file
├── CHANGELOG.md              # Append-only change log
├── TODO.md                   # Active task tracking
├── VERSION                   # Current semantic version
└── .phases.json              # Phase definitions (machine-readable)
```

### Project-Specific Directories

- `src/` - Application source code
- `tests/` - Unit & integration tests
- `migrations/` - Database migrations
- `docs/` - API & architecture docs

## Key Files

| File | Purpose | Permissions |
|------|---------|-------------|
| `.gitignore` | Enterprise gitignore standards | 644 |
| `README.md` | Project documentation | 644 |
| `CHANGELOG.md` | Immutable change history with rationale | 644 |
| `TODO.md` | Active task tracking with validation | 644 |
| `VERSION` | Semantic version (semver) | 644 |
| `.phases.json` | Phase definitions | 644 |

## Development Workflow

### Phase-Driven Development

1. **Start a phase**: `python3 scripts/enterprise-org.py phase --action start --phase "feature-name"`
2. **Work on feature** with todo tracking in `TODO.md`
3. **Complete phase**: `python3 scripts/enterprise-org.py phase --action complete --phase "feature-name" --summary "Description"`
4. **Release**: `python3 scripts/enterprise-org.py release --bump patch --release-message "Release notes"`

### Validation Gates

- **Pre-commit**: Placeholder scan + Security hardening
- **Pre-push**: Full validation suite
- **Release**: All validations must pass

## Troubleshooting

### Common Issues

**Validation fails on structure**
```bash
python3 scripts/enterprise-org.py enforce --workspace . --fix
```

**Security hardening warnings**
```bash
python3 scripts/security_hardening.py --workspace . --fix
```

**Placeholder detected**
```bash
python3 scripts/placeholder_scanner.py --workspace . --fail-on-found
```

**Todo validation failing**
```bash
python3 scripts/todo_validator.py --workspace . --strict
```

**Rollback verification failed**
```bash
python3 scripts/self_validator.py --workspace . --verify-rollback
```

### Recovery Procedures

1. **Corrupted workspace**: Restore from git history or `backups/` if configured
2. **Failed enforcement**: Check validation logs for specific issues
3. **Secrets exposed**: Rotate immediately, audit git history with `git filter-branch`
4. **CHANGELOG corrupted**: Rebuild from git log + manual entries

## Official Sources & Standards

| Standard | Source | Purpose |
|----------|--------|---------|
| Gitignore Templates | https://github.com/github/gitignore | Industry-standard ignore patterns |
| OpenSSF Scorecard | https://github.com/ossf/scorecard | Supply chain security |
| NIST SSDF | https://csrc.nist.gov/Projects/ssdf | Secure software development |
| Semantic Versioning | https://semver.org | Version management |
| Keep a Changelog | https://keepachangelog.com | Changelog format |
| Conventional Commits | https://www.conventionalcommits.org | Commit message format |

## Enterprise Compliance

This workspace enforces:
- ✅ Modular file tree (validated on every operation)
- ✅ Security hardening (gitignore, permissions, secrets detection)
- ✅ Todo-driven development (no untracked work)
- ✅ Zero placeholders (TODO/FIXME/TBD/WIP/stubs rejected)
- ✅ Self-validation with rollback (pre-commit verified)
- ✅ Append-only CHANGELOG.md (with rationale: datetime, author, changes, method, validation, reasoning)
- ✅ Phase-tagged workflow (git tags per phase start/complete)
- ✅ Semantic versioning (automated release management)
- ✅ Robust git control (hooks, sync, branch management)

---

*Generated by enterprise-organization skill | 2026-06-10T05:25:41.107081*
