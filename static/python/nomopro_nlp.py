"""
nomopro_nlp — Natural Language Processing for nomokit-desktop.

Usage:
    from nomopro_nlp import (
        sentiment, sentiment_score, classify, classify_result,
        entities, train, remove_intent, similarity,
        load_sample_intents, export_training, import_training, reset_all
    )
"""

import json
import sys
import threading


def _rpc(cmd, *params):
    counter = _rpc.__dict__.get("counter", 0) + 1
    _rpc.counter = counter
    rid = counter
    payload = json.dumps({"cmd": cmd, "args": list(params), "_requestId": rid})
    sys.stdout.write(payload + "\n")
    sys.stdout.flush()
    result = [None]
    done = threading.Event()
    def _read():
        try:
            line = sys.stdin.readline()
            if line:
                result[0] = json.loads(line.strip())
        except Exception:
            pass
        done.set()
    t = threading.Thread(target=_read, daemon=True)
    t.start()
    done.wait(timeout=5.0)
    if result[0] and result[0].get("_requestId") == rid:
        return result[0].get("value")
    return None


def sentiment(text):
    return _rpc("nlp_sentiment", text)

def sentiment_score(text):
    return _rpc("nlp_sentimentScore", text)

def classify(text):
    return _rpc("nlp_classify", text)

def classify_result(text):
    return _rpc("nlp_classifyResult", text)

def entities(text):
    return _rpc("nlp_entities", text)

def train(label, examples):
    return _rpc("nlp_train", label, examples)

def remove_intent(label):
    return _rpc("nlp_removeIntent", label)

def similarity(t1, t2):
    return _rpc("nlp_similarity", t1, t2)

def load_sample_intents():
    return _rpc("nlp_loadSampleIntents")

def export_training():
    return _rpc("nlp_exportTraining")

def import_training():
    return _rpc("nlp_importTraining")

def reset_all():
    return _rpc("nlp_resetAll")
