#!/usr/bin/env python3
"""
Audit that every SECRET key in appsettings.json is wired in:
  - infra/required-secrets.json (or infra/optional-secrets.json)
  - docker-compose.qa.yml and docker-compose.e2e.yml api service environment block
  - .env.qa.example and .env.e2e.example

Also checks the reverse: every entry in required-secrets.json must exist somewhere
in appsettings*.json or a docker-compose api environment block (catches stale entries).

Classification order:
  1. Explicit entry in infra/key-policy.json
  2. Heuristic: empty string default + secret suffix pattern -> SECRET
  3. Heuristic: non-empty default -> CONFIG
  4. Default: CONFIG

Run from repo root. Exit 0 = clean. Exit 1 = wiring gaps found.
"""

import json
import re
import sys
import glob
from pathlib import Path

import yaml

REPO_ROOT = Path(__file__).parent.parent

APPSETTINGS = REPO_ROOT / "backend/LangTeach.Api/appsettings.json"
REQUIRED_SECRETS = REPO_ROOT / "infra/required-secrets.json"
OPTIONAL_SECRETS = REPO_ROOT / "infra/optional-secrets.json"
KEY_POLICY = REPO_ROOT / "infra/key-policy.json"
COMPOSE_QA = REPO_ROOT / "docker-compose.qa.yml"
COMPOSE_E2E = REPO_ROOT / "docker-compose.e2e.yml"
ENV_QA_EXAMPLE = REPO_ROOT / ".env.qa.example"
ENV_E2E_EXAMPLE = REPO_ROOT / ".env.e2e.example"

SECRET_SUFFIXES = {
    "apikey", "key", "token", "connectionstring", "password",
    "secret", "endpoint", "deploymentname",
}


def flatten_json(obj, prefix=""):
    """Flatten nested dict to colon-separated keys. Arrays are kept as single CONFIG entry."""
    items = {}
    if isinstance(obj, dict):
        for k, v in obj.items():
            full_key = f"{prefix}:{k}" if prefix else k
            if isinstance(v, (dict, list)):
                if isinstance(v, list):
                    items[full_key] = v
                else:
                    items.update(flatten_json(v, full_key))
            else:
                items[full_key] = v
    return items


def classify(key, value, policy):
    if key in policy:
        return policy[key]

    if isinstance(value, list):
        return "CONFIG"

    value_str = str(value) if value is not None else ""

    if not value_str:
        suffix = key.split(":")[-1].lower()
        if any(suffix.endswith(s) for s in SECRET_SUFFIXES):
            return "SECRET"

    return "CONFIG"


def load_compose_api_env(compose_path):
    """Return the api service environment block as a dict {key: value_string}."""
    with open(compose_path) as f:
        doc = yaml.safe_load(f)
    services = doc.get("services", {})
    api = services.get("api", {})
    env = api.get("environment", {})
    if isinstance(env, list):
        result = {}
        for item in env:
            k, _, v = item.partition("=")
            result[k.strip()] = v.strip()
        return result
    return {str(k): str(v) for k, v in env.items()}


def extract_env_var(value_str):
    """Extract the env var name from a compose value like '${SOME_VAR}'. Returns None if not a simple ref."""
    m = re.fullmatch(r'\$\{([A-Z0-9_]+)\}', value_str.strip())
    return m.group(1) if m else None


def load_env_example_vars(path):
    """Return set of declared variable names from an env example file."""
    vars_ = set()
    with open(path) as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#"):
                name = line.split("=", 1)[0].strip()
                if name:
                    vars_.add(name)
    return vars_


def key_to_double_underscore(key):
    return key.replace(":", "__")


def key_to_double_dash(key):
    return key.replace(":", "--")


def double_dash_to_colon(key):
    return key.replace("--", ":")


def double_dash_to_double_underscore(key):
    return key.replace("--", "__")


def collect_appsettings_keys():
    """Return set of all colon-notation keys across all appsettings*.json files."""
    keys = set()
    for path in glob.glob(str(REPO_ROOT / "backend/LangTeach.Api/appsettings*.json")):
        with open(path) as f:
            obj = json.load(f)
        keys.update(flatten_json(obj).keys())
    return keys


def main():
    with open(APPSETTINGS) as f:
        appsettings = json.load(f)
    flat = flatten_json(appsettings)

    with open(KEY_POLICY) as f:
        policy_raw = json.load(f)
    policy = {k: v for k, v in policy_raw.get("keys", {}).items()}

    with open(REQUIRED_SECRETS) as f:
        req_secrets_data = json.load(f)
    required_set = set(req_secrets_data.get("requiredSecrets", []))

    optional_set = set()
    env_only_set = set()
    if OPTIONAL_SECRETS.exists():
        with open(OPTIONAL_SECRETS) as f:
            opt_data = json.load(f)
        optional_set = {e["key"] for e in opt_data.get("optionalSecrets", [])}
        env_only_set = {e["key"] for e in opt_data.get("envOnlySecrets", [])}

    qa_env = load_compose_api_env(COMPOSE_QA)
    e2e_env = load_compose_api_env(COMPOSE_E2E)

    qa_example_vars = load_env_example_vars(ENV_QA_EXAMPLE)
    e2e_example_vars = load_env_example_vars(ENV_E2E_EXAMPLE)

    # Forward check: each SECRET key must be wired everywhere
    forward_failures = []

    for key, value in flat.items():
        classification = classify(key, value, policy)
        if classification != "SECRET":
            continue

        double_dash_key = key_to_double_dash(key)
        double_under_key = key_to_double_underscore(key)

        in_required = double_dash_key in required_set
        in_optional = key in optional_set
        secrets_ok = in_required or in_optional

        qa_compose_ok = double_under_key in qa_env
        e2e_compose_ok = double_under_key in e2e_env

        # For env-example check: find the env var name from the compose entry
        # If compose value is not a simple ${VAR} reference, skip the env-example check
        # (e.g. ConnectionStrings__Default uses a hardcoded string with embedded vars)
        qa_env_var = extract_env_var(qa_env.get(double_under_key, ""))
        e2e_env_var = extract_env_var(e2e_env.get(double_under_key, ""))

        if not qa_compose_ok or not e2e_compose_ok:
            # Can't check env example when compose entry is missing
            env_example_status = "N/A"
            env_example_ok = True
        elif qa_env_var and e2e_env_var:
            qa_example_ok = qa_env_var in qa_example_vars
            e2e_example_ok = e2e_env_var in e2e_example_vars
            env_example_ok = qa_example_ok and e2e_example_ok
            env_example_status = "OK" if env_example_ok else "MISSING"
        elif qa_env_var:
            env_example_ok = qa_env_var in qa_example_vars
            env_example_status = "OK" if env_example_ok else "MISSING"
        elif e2e_env_var:
            env_example_ok = e2e_env_var in e2e_example_vars
            env_example_status = "OK" if env_example_ok else "MISSING"
        else:
            # Compose values are hardcoded literals (not ${VAR} refs) - skip env-example check
            env_example_ok = True
            env_example_status = "N/A"

        if not (secrets_ok and qa_compose_ok and e2e_compose_ok and env_example_ok):
            forward_failures.append({
                "key": key,
                "required_secrets": "OK" if secrets_ok else "MISSING",
                "qa_compose": "OK" if qa_compose_ok else "MISSING",
                "e2e_compose": "OK" if e2e_compose_ok else "MISSING",
                "env_example": env_example_status,
            })

    # Reverse check: every required-secrets entry must exist in appsettings.json.
    # Keys in envOnlySecrets are exempt (set via env var without an appsettings declaration).
    # This catches stale entries when a config key is removed from appsettings.
    all_appsettings_keys = collect_appsettings_keys()

    reverse_failures = []
    for secret in required_set:
        colon_key = double_dash_to_colon(secret)
        in_appsettings = colon_key in all_appsettings_keys
        in_env_only = colon_key in env_only_set
        if not (in_appsettings or in_env_only):
            reverse_failures.append(secret)

    # Report
    failed = False

    if forward_failures:
        failed = True
        print("appsettings.json declared SECRET keys not fully wired:\n")
        header = f"| {'Key':<40} | {'required-secrets':<16} | {'qa compose':<10} | {'e2e compose':<11} | {'env example':<11} |"
        sep = f"|{'-'*42}|{'-'*18}|{'-'*12}|{'-'*13}|{'-'*13}|"
        print(header)
        print(sep)
        for f_ in forward_failures:
            print(
                f"| {f_['key']:<40} | {f_['required_secrets']:<16} | {f_['qa_compose']:<10} | {f_['e2e_compose']:<11} | {f_['env_example']:<11} |"
            )
        print()
        print("Add the missing entries, or add a justified exception in infra/optional-secrets.json.")
        print()

    if reverse_failures:
        failed = True
        print("required-secrets.json entries not found in appsettings.json:")
        print("(These may be stale entries left over after a config key was removed."
              " If the key is set purely via env var with no appsettings declaration,"
              " add it to the envOnlySecrets list in infra/optional-secrets.json.)")
        print()
        for s in reverse_failures:
            print(f"  - {s}")
        print()
        print("Remove the stale entries from infra/required-secrets.json, or re-add the key to appsettings.json.")
        print()

    if not failed:
        print("Config wiring audit passed: all SECRET keys are fully wired.")

    sys.exit(1 if failed else 0)


if __name__ == "__main__":
    main()
