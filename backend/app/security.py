import asyncio
from dataclasses import dataclass
import ipaddress
import re
import socket
from urllib.parse import urlsplit, urlunsplit

from .errors import ServiceError


HOST = re.compile(r"(?=.{1,253}\Z)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z](?:[a-z0-9-]{0,61}[a-z0-9])?\Z")
YOUTUBE = frozenset({"youtube.com", "www.youtube.com", "m.youtube.com", "music.youtube.com", "youtu.be"})
YOUTUBE_SECONDARY = frozenset({"youtubei.googleapis.com", "i.ytimg.com", "s.ytimg.com"})
IPV6_PUBLIC = ipaddress.ip_network("2000::/3")


def deny() -> ServiceError:
    return ServiceError("DESTINATION_BLOCKED", "A rede de destino não é permitida pelo serviço.", 403)


def parse_url(value: str):
    try:
        if len(value) > 8192 or re.search(r"[^\x21-\x7e]|\\", value):
            raise ValueError
        parsed = urlsplit(value)
        if parsed.scheme not in {"http", "https"} or not parsed.hostname or parsed.username is not None:
            raise ValueError
        port = 443 if parsed.scheme == "https" else 80
        if parsed.port not in {None, port} or not HOST.fullmatch(parsed.hostname):
            if parsed.hostname and not HOST.fullmatch(parsed.hostname):
                try:
                    ipaddress.ip_address(parsed.hostname)
                except ValueError:
                    pass
                else:
                    raise deny()
            raise ValueError
        if parsed.netloc.lower() not in {parsed.hostname, f"{parsed.hostname}:{port}"}:
            raise ValueError
        return parsed
    except ValueError:
        raise ServiceError("INVALID_URL", "Informe um endereço HTTP ou HTTPS válido, sem credenciais.") from None


def public_ip(value: str) -> bool:
    try:
        ip = ipaddress.ip_address(value)
    except ValueError:
        return False
    return bool(
        ip.is_global and not (ip.is_multicast or ip.is_reserved or ip.is_loopback or ip.is_link_local)
        and (ip.version == 4 or (ip in IPV6_PUBLIC and not (ip.sixtofour or ip.teredo or ip.ipv4_mapped)))
    )


@dataclass(frozen=True)
class Source:
    url: str
    host: str
    kind: str


class OriginPolicy:
    def __init__(self, direct_hosts: tuple[str, ...] = ()):
        if any(not HOST.fullmatch(host) for host in direct_hosts):
            raise ValueError("EDU_DIRECT_HOSTS aceita somente nomes DNS exatos")
        self.direct_hosts = frozenset(direct_hosts)

    def admit(self, url: str) -> Source:
        parsed = parse_url(url)
        host = parsed.hostname
        if host in YOUTUBE:
            kind = "youtube"
        elif host in self.direct_hosts:
            kind = "direct"
        else:
            raise ServiceError("UNSUPPORTED_ORIGIN", "A origem não está habilitada para análise.", 403)
        return Source(urlunsplit(parsed._replace(fragment="")), host, kind)

    def allows(self, source: Source, host: str, port: int) -> bool:
        if not HOST.fullmatch(host) or port not in {80, 443}:
            return False
        if source.kind == "direct":
            return host == source.host
        return host in YOUTUBE or host in YOUTUBE_SECONDARY or host.endswith(".googlevideo.com")

    async def resolve(self, host: str, port: int) -> tuple[str, ...]:
        try:
            async with asyncio.timeout(5):
                records = await asyncio.get_running_loop().getaddrinfo(
                    host + ".", port, type=socket.SOCK_STREAM, proto=socket.IPPROTO_TCP,
                )
        except (OSError, TimeoutError):
            raise ServiceError("ORIGIN_UNREACHABLE", "Não foi possível conectar à origem.", 502) from None
        ips = tuple(dict.fromkeys(record[4][0] for record in records))
        if not ips or not all(public_ip(ip) for ip in ips):
            raise deny()
        return ips

    async def connect(self, source: Source, host: str, port: int):
        if not self.allows(source, host, port):
            raise deny()
        for ip in await self.resolve(host, port):
            try:
                async with asyncio.timeout(4):
                    return await asyncio.open_connection(
                        ip, port, flags=socket.AI_NUMERICHOST, limit=32768,
                    )
            except (OSError, TimeoutError):
                continue
        raise ServiceError("ORIGIN_UNREACHABLE", "Não foi possível conectar à origem.", 502)
