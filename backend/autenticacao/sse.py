"""
Módulo de Server-Sent Events (SSE) para transmissão de status em tempo real.
Separado de views.py para evitar importações circulares entre apps.
"""
import json
import threading
import queue

_sse_lock    = threading.Lock()
_sse_clients: dict[int, set] = {}   # user_id → {queue, ...}


def sse_register(user_id: int) -> queue.SimpleQueue:
    q = queue.SimpleQueue()
    with _sse_lock:
        _sse_clients.setdefault(user_id, set()).add(q)
    return q


def sse_unregister(user_id: int, q: queue.SimpleQueue):
    with _sse_lock:
        if user_id in _sse_clients:
            _sse_clients[user_id].discard(q)
            if not _sse_clients[user_id]:
                del _sse_clients[user_id]


def sse_broadcast(event: str, data: dict):
    """Envia um evento SSE para todos os clientes conectados."""
    payload = f"event: {event}\ndata: {json.dumps(data)}\n\n"
    with _sse_lock:
        all_queues = [q for qs in _sse_clients.values() for q in qs]
    for q in all_queues:
        try:
            q.put_nowait(payload)
        except Exception:
            pass


def sse_clients_online() -> list[int]:
    """Retorna lista de user_ids com clientes conectados."""
    with _sse_lock:
        return list(_sse_clients.keys())
