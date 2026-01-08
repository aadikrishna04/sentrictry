"""Security Analysis Engine for Sentric MVP.

Analyzes agent actions and reasoning to detect potential security issues.
"""

import json
import re
from typing import Optional
from urllib.parse import urlparse

SUSPICIOUS_DOMAINS = [
    "malware.com",
    "phishing.site",
    "hack.ru",
    "evil.net",
    "download-free.xyz",
    "login-secure.tk",
]

SENSITIVE_KEYWORDS = [
    "password",
    "credit card",
    "ssn",
    "social security",
    "api key",
    "secret",
    "token",
    "credentials",
]


def analyze_events(events: list[dict]) -> list[dict]:
    """Analyze a sequence of events and return security findings."""
    findings = []

    actions = [e for e in events if e.get("type") == "action"]
    reasonings = [e for e in events if e.get("type") == "reasoning"]

    # Rule 1: Non-HTTPS form submissions
    findings.extend(_check_non_https_submissions(actions))

    # Rule 2: Suspicious domains
    findings.extend(_check_suspicious_domains(actions))

    # Rule 3: Uncertainty before actions
    findings.extend(_check_uncertain_reasoning(reasonings, actions))

    # Rule 4: Rapid repeated actions (possible loop)
    findings.extend(_check_action_loops(actions))

    # Rule 5: Sensitive data exposure
    findings.extend(_check_sensitive_data(actions))

    # Rule 6: Unknown domain data submission
    findings.extend(_check_unknown_domain_submissions(actions))

    return findings


def _check_non_https_submissions(actions: list[dict]) -> list[dict]:
    """Check for form submissions on non-HTTPS pages."""
    findings = []

    for action in actions:
        payload = action.get("payload", {})
        url = payload.get("url", "")
        kind = payload.get("kind", "")

        if kind in ["click", "type", "submit"] and url.startswith("http://"):
            findings.append(
                {
                    "severity": "high",
                    "category": "insecure_transport",
                    "description": f"Action performed on non-HTTPS page: {url}",
                    "evidence": [action],
                }
            )

    return findings


def _check_suspicious_domains(actions: list[dict]) -> list[dict]:
    """Check for navigation to known suspicious domains."""
    findings = []

    for action in actions:
        payload = action.get("payload", {})
        url = payload.get("url", "")

        if url:
            try:
                domain = urlparse(url).netloc.lower()
                for suspicious in SUSPICIOUS_DOMAINS:
                    if suspicious in domain:
                        findings.append(
                            {
                                "severity": "critical",
                                "category": "suspicious_navigation",
                                "description": f"Navigation to suspicious domain: {domain}",
                                "evidence": [action],
                            }
                        )
            except:
                pass

    return findings


def _check_uncertain_reasoning(
    reasonings: list[dict], actions: list[dict]
) -> list[dict]:
    """Check for uncertain reasoning before important actions."""
    findings = []

    uncertainty_patterns = [
        r"not sure",
        r"uncertain",
        r"might be",
        r"could be wrong",
        r"risky",
        r"dangerous",
        r"shouldn't",
        r"probably shouldn't",
    ]

    for reasoning in reasonings:
        payload = reasoning.get("payload", {})
        content = payload.get("content", "").lower()

        for pattern in uncertainty_patterns:
            if re.search(pattern, content):
                findings.append(
                    {
                        "severity": "medium",
                        "category": "uncertain_action",
                        "description": f"Agent expressed uncertainty: '{content[:100]}...'",
                        "evidence": [reasoning],
                    }
                )
                break

    return findings


def _check_action_loops(actions: list[dict]) -> list[dict]:
    """Check for repeated identical actions (possible infinite loop)."""
    findings = []

    if len(actions) < 5:
        return findings

    # Check for 5+ identical consecutive actions
    for i in range(len(actions) - 4):
        window = actions[i : i + 5]
        kinds = [a.get("payload", {}).get("kind") for a in window]
        selectors = [a.get("payload", {}).get("selector") for a in window]

        if len(set(kinds)) == 1 and len(set(selectors)) == 1 and kinds[0] is not None:
            findings.append(
                {
                    "severity": "medium",
                    "category": "action_loop",
                    "description": f"Detected repeated action loop: {kinds[0]} on {selectors[0]}",
                    "evidence": window,
                }
            )
            break

    return findings


def _check_sensitive_data(actions: list[dict]) -> list[dict]:
    """Check for potential sensitive data handling."""
    findings = []

    for action in actions:
        payload = action.get("payload", {})
        value = str(payload.get("value", "")).lower()

        for keyword in SENSITIVE_KEYWORDS:
            if keyword in value:
                findings.append(
                    {
                        "severity": "high",
                        "category": "sensitive_data",
                        "description": f"Potential sensitive data detected in action value",
                        "evidence": [{"action": action, "matched_keyword": keyword}],
                    }
                )
                break

    return findings


def _check_unknown_domain_submissions(actions: list[dict]) -> list[dict]:
    """Check for form submissions to unknown/uncommon domains."""
    findings = []

    trusted_tlds = [".gov", ".edu", ".org"]
    common_domains = [
        "google.com",
        "amazon.com",
        "microsoft.com",
        "github.com",
        "stripe.com",
    ]

    for action in actions:
        payload = action.get("payload", {})
        kind = payload.get("kind", "")
        url = payload.get("url", "")

        if kind in ["submit", "click"] and url:
            try:
                domain = urlparse(url).netloc.lower()
                is_trusted = any(domain.endswith(tld) for tld in trusted_tlds)
                is_common = any(common in domain for common in common_domains)

                if not is_trusted and not is_common and domain:
                    # Only flag if it looks like a form submission
                    selector = payload.get("selector", "")
                    if (
                        "submit" in selector.lower()
                        or "form" in selector.lower()
                        or kind == "submit"
                    ):
                        findings.append(
                            {
                                "severity": "low",
                                "category": "unknown_domain_submission",
                                "description": f"Form submission to uncommon domain: {domain}",
                                "evidence": [action],
                            }
                        )
            except:
                pass

    return findings
