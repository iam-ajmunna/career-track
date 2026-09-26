from __future__ import annotations

import asyncio
import hashlib
import ipaddress
import socket
from dataclasses import dataclass
from datetime import datetime, timezone
from urllib.parse import urlparse
from urllib.robotparser import RobotFileParser

import httpx
import trafilatura
from bs4 import BeautifulSoup
from ddgs import DDGS

from .ai import local_ai
from .config import get_settings

settings = get_settings()


@dataclass
class SearchHit:
    title: str
    url: str
    snippet: str


def fingerprint(url: str, title: str) -> str:
    material = f"{url.strip().lower()}|{title.strip().lower()}".encode("utf-8")
    return hashlib.sha256(material).hexdigest()


def _public_host(hostname: str) -> bool:
    try:
        infos = socket.getaddrinfo(hostname, None)
    except socket.gaierror:
        return False
    for info in infos:
        address = info[4][0]
        try:
            ip = ipaddress.ip_address(address)
        except ValueError:
            return False
        if ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_reserved or ip.is_multicast:
            return False
    return True


def validate_public_url(url: str) -> bool:
    parsed = urlparse(url)
    return parsed.scheme in {"http", "https"} and bool(parsed.hostname) and _public_host(parsed.hostname)


async def web_search(query: str, max_results: int | None = None) -> list[SearchHit]:
    limit = max_results or settings.search_max_results

    def run() -> list[SearchHit]:
        rows = DDGS().text(query, max_results=limit, safesearch="moderate")
        hits: list[SearchHit] = []
        for row in rows:
            href = row.get("href") or row.get("url") or ""
            if href and validate_public_url(href):
                hits.append(SearchHit(
                    title=(row.get("title") or "Scholarship opportunity")[:300],
                    url=href,
                    snippet=(row.get("body") or row.get("snippet") or "")[:1200],
                ))
        return hits

    return await asyncio.to_thread(run)


async def _robots_allowed(client: httpx.AsyncClient, url: str) -> bool:
    parsed = urlparse(url)
    robots_url = f"{parsed.scheme}://{parsed.netloc}/robots.txt"
    try:
        response = await client.get(robots_url)
        if not response.is_success:
            return True
        parser = RobotFileParser()
        parser.set_url(robots_url)
        parser.parse(response.text.splitlines())
        return parser.can_fetch(settings.user_agent, url)
    except httpx.HTTPError:
        return True


async def scrape_page(url: str) -> str:
    if not validate_public_url(url):
        raise ValueError("Unsafe or unsupported URL.")

    headers = {"User-Agent": settings.user_agent, "Accept": "text/html,application/xhtml+xml"}
    async with httpx.AsyncClient(
        timeout=settings.scrape_timeout_seconds,
        headers=headers,
        follow_redirects=True,
        max_redirects=4,
    ) as client:
        if not await _robots_allowed(client, url):
            raise PermissionError("robots.txt disallows automated retrieval.")

        response = await client.get(url)
        response.raise_for_status()
        content_type = response.headers.get("content-type", "")
        if "text/html" not in content_type:
            return ""

        extracted = trafilatura.extract(response.text, include_links=False, include_tables=True) or ""
        if not extracted:
            soup = BeautifulSoup(response.text, "html.parser")
            for tag in soup(["script", "style", "nav", "footer"]):
                tag.decompose()
            extracted = soup.get_text("\n", strip=True)
        return extracted[: settings.scrape_max_chars]


def build_query(profile: dict, user_query: str) -> str:
    parts = [user_query.strip()]
    degree = profile.get("degree", "")
    fields = profile.get("fields", []) or []
    nationality = profile.get("nationality", "")
    residence = profile.get("residence_country", "")
    if "scholarship" not in user_query.lower():
        parts.append("fully funded scholarship")
    if degree:
        parts.append("masters MSc")
    if fields:
        parts.append(" ".join(str(x) for x in fields[:3]))
    if nationality:
        parts.append(f"for {nationality} students")
    elif residence:
        parts.append(f"for {residence} students")
    return " ".join(p for p in parts if p)


async def discover(profile: dict, user_query: str) -> list[dict]:
    query = build_query(profile, user_query)
    hits = await web_search(query)
    opportunities: list[dict] = []

    for hit in hits:
        try:
            page_text = await scrape_page(hit.url)
        except (httpx.HTTPError, ValueError, PermissionError):
            page_text = hit.snippet

        if not page_text.strip():
            continue

        data = await local_ai.extract_scholarship(page_text, hit.url, hit.title)
        title = (data.get("title") or hit.title).strip()[:300]
        opportunity = {
            "fingerprint": fingerprint(hit.url, title),
            "title": title,
            "provider": str(data.get("provider") or "")[:260],
            "country": str(data.get("country") or "")[:160],
            "degree_level": str(data.get("degree_level") or "")[:100],
            "funding": str(data.get("funding") or ""),
            "deadline": str(data.get("deadline") or "")[:80],
            "eligibility": str(data.get("eligibility") or ""),
            "description": str(data.get("description") or hit.snippet),
            "url": hit.url,
            "source_domain": urlparse(hit.url).netloc,
            "source_type": "web",
            "verified_at": datetime.now(timezone.utc),
        }
        opportunities.append(opportunity)

    return opportunities
