"""Security Analysis Engine for Sentric MVP.

Analyzes agent actions and reasoning to detect potential security issues.
Uses LLM-based contextual analysis for comprehensive security threat detection.
"""

import json
import re
import os
from typing import List, Dict, Any

# Try to import OpenAI for LLM-based analysis (required)
try:
    from openai import OpenAI
    LLM_AVAILABLE = True
except ImportError:
    LLM_AVAILABLE = False
    OpenAI = None


def analyze_events(events: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Analyze a sequence of events and return security findings.
    
    Uses LLM-based contextual analysis for comprehensive security threat detection.
    
    Args:
        events: List of event dictionaries with 'type' and 'payload' keys
    
    Returns:
        List of finding dictionaries with severity, category, description, evidence
        Returns empty list if LLM is unavailable or analysis fails
    """
    if not events:
        return []
    
    if not LLM_AVAILABLE:
        print(f"[Security Analyzer] ⚠️  LLM not available - OpenAI package not installed")
        return []
    
    actions = [e for e in events if e.get("type") == "action"]
    reasonings = [e for e in events if e.get("type") == "reasoning"]

    # Run LLM-based analysis
    try:
        llm_findings = _analyze_with_llm(events, actions, reasonings)
        if llm_findings:
            print(f"[Security Analyzer] ✅ LLM analysis completed: {len(llm_findings)} findings")
            return llm_findings
        else:
            print(f"[Security Analyzer] ✅ LLM analysis completed: No security issues detected")
            return []
    except Exception as e:
        print(f"[Security Analyzer] ⚠️  LLM analysis failed: {e}")
        return []


def _analyze_with_llm(
    events: List[Dict[str, Any]],
    actions: List[Dict[str, Any]],
    reasonings: List[Dict[str, Any]],
) -> List[Dict[str, Any]]:
    """Use LLM to analyze events for security issues with contextual understanding.
    
    This provides comprehensive security analysis by understanding:
    - Context and intent behind actions
    - Subtle security risks in reasoning
    - Novel attack patterns
    - Social engineering attempts
    - Complex multi-step attack chains
    """
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        return []  # No API key, skip LLM analysis
    
    client = OpenAI(api_key=api_key)
    
    # Prepare context for LLM analysis
    # Limit to recent events to stay within token limits (last 50 events or ~10k tokens)
    recent_events = events[-50:] if len(events) > 50 else events
    
    # Format events for LLM
    events_summary = _format_events_for_llm(recent_events)
    
    # Create security-focused prompt
    prompt = f"""You are a cybersecurity expert analyzing AI browser agent behavior for security threats.

Analyze the following agent actions and reasoning to identify potential security issues:

{events_summary}

Focus on detecting:
1. **Authentication & Authorization Risks**: Attempts to bypass auth, privilege escalation, session hijacking
2. **Data Exposure**: Sensitive data handling, PII leaks, credential exposure
3. **Network Security**: Suspicious network requests, data exfiltration, CORS issues
4. **Social Engineering**: Phishing patterns, deceptive interfaces, trust manipulation
5. **Injection Attacks**: XSS attempts, SQL injection patterns, command injection
6. **Business Logic Flaws**: Payment manipulation, race conditions, workflow bypasses
7. **Context-Specific Risks**: Domain-specific threats based on the agent's task

Each finding should have:
- severity: "critical", "high", "medium", or "low"
- category: A short category name (e.g., "authentication_bypass", "data_exposure")
- description: A clear explanation of the security concern
- evidence_indices: Array of event indices (0-based) that support this finding

Be specific and evidence-based. Only flag genuine security concerns, not normal agent behavior.
If no security issues are found, return an empty array.

Return your findings as a JSON object with a 'findings' key containing an array of findings."""

    try:
        # Use JSON mode for structured output (requires response to be a JSON object)
        model = os.getenv("SECURITY_ANALYZER_LLM_MODEL", "gpt-4o-mini")
        use_json_mode = "gpt-4" in model or "o1" not in model
        
        response = client.chat.completions.create(
            model=model,
            messages=[
                {
                    "role": "system",
                    "content": "You are a cybersecurity expert. Always respond with valid JSON only, no additional text."
                },
                {"role": "user", "content": prompt}
            ],
            temperature=0.1,  # Low temperature for consistent security analysis
            max_tokens=2000,
            response_format={"type": "json_object"} if use_json_mode else None,
        )
        
        content = response.choices[0].message.content.strip()
        
        # Parse JSON response
        # Handle both array and object with "findings" key
        try:
            result = json.loads(content)
            if isinstance(result, dict) and "findings" in result:
                llm_findings = result["findings"]
            elif isinstance(result, list):
                llm_findings = result
            else:
                llm_findings = []
        except json.JSONDecodeError:
            # Try to extract JSON from markdown code blocks if present
            json_match = re.search(r'```(?:json)?\s*({.*?}|\[.*?\])\s*```', content, re.DOTALL)
            if json_match:
                parsed = json.loads(json_match.group(1))
                if isinstance(parsed, dict) and "findings" in parsed:
                    llm_findings = parsed["findings"]
                elif isinstance(parsed, list):
                    llm_findings = parsed
                else:
                    llm_findings = []
            else:
                print(f"[Security Analyzer] Warning: Failed to parse LLM response as JSON: {content[:200]}")
                return []
        
        # Convert LLM findings to our format and map evidence indices to actual events
        formatted_findings = []
        for finding in llm_findings:
            if not isinstance(finding, dict):
                continue
            
            # Map evidence indices to actual events
            evidence_indices = finding.get("evidence_indices", [])
            evidence_events = [recent_events[i] for i in evidence_indices if 0 <= i < len(recent_events)]
            
            formatted_findings.append({
                "severity": finding.get("severity", "medium"),
                "category": finding.get("category", "llm_detected_issue"),
                "description": finding.get("description", "Security concern detected by LLM analysis"),
                "evidence": evidence_events,
                "source": "llm",  # Tag LLM-generated findings
            })
        
        return formatted_findings
        
    except Exception as e:
        print(f"[Security Analyzer] Error in LLM analysis: {e}")
        return []


def _format_events_for_llm(events: List[Dict[str, Any]]) -> str:
    """Format events into a readable string for LLM analysis."""
    formatted = []
    
    for i, event in enumerate(events):
        event_type = event.get("type", "unknown")
        payload = event.get("payload", {})
        timestamp = event.get("timestamp", "")
        
        event_str = f"\n[{i}] {event_type.upper()}"
        if timestamp:
            event_str += f" at {timestamp}"
        
        if event_type == "action":
            kind = payload.get("kind", "")
            url = payload.get("url", "")
            selector = payload.get("selector", "")
            value = payload.get("value", "")
            
            event_str += f"\n  Action: {kind}"
            if url:
                event_str += f"\n  URL: {url}"
            if selector:
                event_str += f"\n  Element: {selector}"
            if value:
                # Truncate long values
                value_display = value[:100] + "..." if len(value) > 100 else value
                event_str += f"\n  Value: {value_display}"
        
        elif event_type == "reasoning":
            content = payload.get("content", "")
            # Truncate very long reasoning
            content_display = content[:500] + "..." if len(content) > 500 else content
            event_str += f"\n  Reasoning: {content_display}"
        
        formatted.append(event_str)
    
    return "\n".join(formatted)
