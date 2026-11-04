from slowapi import Limiter
from slowapi.util import get_remote_address

# Storage em memória do processo (padrão do slowapi) — suficiente para um
# único worker; num deploy com múltiplos workers/instâncias cada processo
# teria seu próprio contador. Se isso passar a importar, trocar por um
# backend compartilhado (Redis, já presente na config mas hoje sem uso).
limiter = Limiter(key_func=get_remote_address)
