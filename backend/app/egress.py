import asyncio
import base64
from contextlib import suppress
import hmac
import re
import secrets

from .errors import ServiceError
from .security import deny, parse_url


HEADER = re.compile(rb"[A-Za-z0-9!#$%&'*+.^_`|~-]+")
HOP_HEADERS = {b"proxy-authorization", b"proxy-connection", b"connection", b"keep-alive",
               b"host", b"te", b"trailer", b"upgrade", b"expect", b"cookie", b"authorization"}


class Egress:
    """HTTP proxy restricted to one extraction or download, bound to loopback."""

    def __init__(self, policy, source, byte_limit):
        self.policy, self.source = policy, source
        self.byte_limit = byte_limit
        self.bytes = 0
        self.secret = secrets.token_urlsafe(24)
        self.authorization = b"Basic " + base64.b64encode(f"engine:{self.secret}".encode())
        self.sessions = set()
        self.failure = None

    async def __aenter__(self):
        self.server = await asyncio.start_server(self.handle, "127.0.0.1", 0, limit=32768, backlog=8)
        self.url = f"http://engine:{self.secret}@127.0.0.1:{self.server.sockets[0].getsockname()[1]}"
        return self

    async def __aexit__(self, *exc):
        self.server.close()
        running = list(self.sessions)
        for task in running:
            task.cancel()
        await asyncio.gather(*running, return_exceptions=True)
        await self.server.wait_closed()

    async def copy(self, reader, writer, incoming):
        while chunk := await reader.read(16384):
            if incoming:
                self.bytes += len(chunk)
                if self.bytes > self.byte_limit:
                    raise ServiceError("SIZE_LIMIT", "A transferência ultrapassou o limite de dados.", 413)
            writer.write(chunk)
            await writer.drain()

    @staticmethod
    async def close(writer):
        writer.close()
        with suppress(OSError, TimeoutError):
            async with asyncio.timeout(1):
                await writer.wait_closed()

    async def handle(self, reader, writer):
        current = asyncio.current_task()
        self.sessions.add(current)
        upstream = None
        connected = False
        try:
            if len(self.sessions) > 8:
                return
            async with asyncio.timeout(5):
                block = await reader.readuntil(b"\r\n\r\n")
            start, *lines = block[:-4].split(b"\r\n")
            method, authority, version = start.decode("ascii").split(" ")
            if version not in {"HTTP/1.0", "HTTP/1.1"} or len(authority) > 8192:
                raise ValueError
            headers: list[tuple[bytes, bytes]] = []
            for line in lines:
                name, sep, value = line.partition(b":")
                if not sep or not HEADER.fullmatch(name) or re.search(rb"[\x00-\x08\x0a-\x1f\x7f]", value):
                    raise ValueError
                headers.append((name.lower(), value.strip()))
            auth = [value for key, value in headers if key == b"proxy-authorization"]
            authenticated = len(auth) == 1 and hmac.compare_digest(auth[0], self.authorization)
            if not authenticated:
                writer.write(b"HTTP/1.1 407 Proxy Authentication Required\r\nConnection: close\r\nContent-Length: 0\r\n\r\n")
                await writer.drain()
                return
            if any(name == b"transfer-encoding" or (name == b"content-length" and value != b"0")
                   for name, value in headers):
                raise deny()

            if method == "CONNECT":
                host, sep, port = authority.lower().partition(":")
                if not sep or port != "443":
                    raise deny()
                remote, upstream = await self.policy.connect(self.source, host, 443)
                writer.write(b"HTTP/1.1 200 Connection established\r\n\r\n")
                connected = True
                await writer.drain()
                uploads = asyncio.create_task(self.copy(reader, upstream, False))
                downloads = asyncio.create_task(self.copy(remote, writer, True))
                tasks = (uploads, downloads)
                try:
                    done, _ = await asyncio.wait(tasks, return_when=asyncio.FIRST_COMPLETED)
                    for task in done:
                        task.result()
                finally:
                    for task in tasks:
                        task.cancel()
                    await asyncio.gather(*tasks, return_exceptions=True)
            elif method in {"GET", "HEAD"}:
                url = parse_url(authority)
                if url.scheme != "http" or url.fragment:
                    raise deny()
                remote, upstream = await self.policy.connect(self.source, url.hostname, 80)
                target = url.path or "/"
                if url.query:
                    target += "?" + url.query
                excluded = HOP_HEADERS | {b"content-length"}
                for name, value in headers:
                    if name == b"connection":
                        excluded = excluded | {token.strip().lower() for token in value.split(b",")}
                request = f"{method} {target} HTTP/1.1\r\nHost: {url.hostname}\r\nConnection: close\r\n".encode()
                for key, value in headers:
                    if key not in excluded:
                        request += key + b": " + value + b"\r\n"
                upstream.write(request + b"\r\n")
                await upstream.drain()
                connected = True
                await self.copy(remote, writer, True)
            else:
                raise deny()
        except ServiceError as error:
            self.failure = error
            if not connected:
                writer.write(b"HTTP/1.1 502 Rejected\r\nConnection: close\r\nContent-Length: 0\r\n\r\n")
                with suppress(OSError):
                    await writer.drain()
        except (ValueError, TimeoutError, asyncio.IncompleteReadError, asyncio.LimitOverrunError, OSError):
            pass
        finally:
            if upstream is not None:
                await self.close(upstream)
            await self.close(writer)
            self.sessions.discard(current)
