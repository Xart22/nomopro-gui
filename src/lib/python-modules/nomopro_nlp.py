"""
nomopro_nlp — Natural Language Processing module for nomokit-desktop.

Usage (Python IDE):
    from nomopro_nlp import sentiment, classify, entities, train, similarity

Functions:
    sentiment(text)        -> "positive" | "negative" | "neutral"
    classify(text)         -> "label" | ""
    entities(text)         -> JSON string
    train(label, examples) -> None
    similarity(t1, t2)     -> 0.0 - 1.0
"""

import sys, json, uuid, os

_COUNTER = 0

def _nlp(method, *params):
    global _COUNTER
    _COUNTER += 1
    rid = f"n{_COUNTER}"
    payload = json.dumps({"cmd": "nlp", "args": [method] + list(params), "_requestId": rid})
    sys.stdout.write(payload + "\n")
    sys.stdout.flush()
    line = sys.stdin.readline()
    if line:
        r = json.loads(line.strip())
        if r.get("_requestId") == rid:
            return r.get("value")
    return None

def sentiment(text):
    return _nlp("sentiment", text)

def classify(text):
    return _nlp("classify", text)

def entities(text):
    return _nlp("entities", text)

def train(label, examples):
    return _nlp("train", label, examples)

def similarity(t1, t2):
    return _nlp("similarity", t1, t2)
