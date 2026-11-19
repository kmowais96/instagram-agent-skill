#!/usr/bin/env python3
"""Pull the exact wording (English + Arabic) and gradings of a hadith or ayah,
so nothing on a slide is quoted from memory.

  python3 verify.py hadith bukhari 6464        by number
  python3 verify.py find   muslim "sun rose"   by phrase (needed for Muslim, see below)
  python3 verify.py page   muslim:976a           any hadith by its sunnah.com-style ref
                                               (Abd al-Baqi numbers for Muslim), via hadithunlocked.com
  python3 verify.py quran  13 28               one ayah
  python3 verify.py quran  83 14-15            a range

Collections: bukhari muslim abudawud tirmidhi nasai ibnmajah malik nawawi qudsi dehlawi
Data: fawazahmed0/hadith-api and quran-api (public JSON served by jsDelivr).

NUMBERING TRAP: for Bukhari, Abu Dawud, Tirmidhi, Nasa'i and Ibn Majah the
number here is the conventional one that sunnah.com shows. For MUSLIM it is a
sequential count that does NOT match the usual Abd al-Baqi number (Muslim 670
is 1525 here). Use `find` for Muslim and cite either the Abd al-Baqi number
after confirming it on sunnah.com, or the in-book reference this prints.
"""
import json, os, sys, tempfile, urllib.request

CDN = "https://cdn.jsdelivr.net/gh/fawazahmed0/{repo}@1/editions/{path}.json"

def get(repo, path):
    req = urllib.request.Request(CDN.format(repo=repo, path=path), headers={"User-Agent": "carousel-verify"})
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.load(r)

def show(book, h, ar, chapter=""):
    g = "; ".join(f'{x["grade"]} ({x["name"]})' for x in h.get("grades", []))
    if not g:
        g = "none listed: Bukhari and Muslim are sahih by consensus" if book.startswith(("Sahih al Bukhari", "Sahih Muslim")) else "NONE LISTED: find a grading before using it"
    ref = h.get("reference", {})
    print(f'# {book} {h["hadithnumber"]}  (in-book ref: book {ref.get("book")}, hadith {ref.get("hadith")})  {chapter}')
    print("GRADES:", g)
    print("\nEN:", h["text"].strip())
    if ar: print("\nAR:", ar.strip())
    print()

def hadith(col, num):
    if col == "muslim":
        print("!! Muslim numbers here are sequential, not Abd al-Baqi. Use: verify.py find muslim \"<phrase>\"\n")
    e = get("hadith-api", f"eng-{col}/{num}")
    try:
        ar = get("hadith-api", f"ara-{col}/{num}")["hadiths"][0]["text"]
    except Exception:
        ar = "(Arabic not in this dataset for this number: copy it from sunnah.com or hadithunlocked.com)"
    show(e["metadata"]["name"], e["hadiths"][0], ar, "; ".join(e["metadata"].get("section", {}).values()))

def find(col, phrase):
    cache = os.path.join(tempfile.gettempdir(), f"hadith-eng-{col}.json")
    if not os.path.exists(cache):
        urllib.request.urlretrieve(CDN.format(repo="hadith-api", path=f"eng-{col}.min"), cache)
    d = json.load(open(cache))
    words = phrase.lower().split()
    hits = [h for h in d["hadiths"] if all(w in h["text"].lower() for w in words)]
    print(f"{len(hits)} match(es) for {phrase!r} in {d['metadata']['name']}\n")
    for h in hits[:8]:
        show(d["metadata"]["name"], h, "")

def page(ref, _=None):
    import html, re
    req = urllib.request.Request(f"https://hadithunlocked.com/{ref}", headers={"User-Agent": "Mozilla/5.0"})
    raw = urllib.request.urlopen(req, timeout=60).read().decode("utf8", "ignore")
    lines = [html.unescape(l).strip() for l in re.sub(r"<script.*?</script>|<style.*?</style>", "", raw, flags=re.S).split("<")]
    text = [re.sub(r"^[^>]*>", "", l).strip() for l in lines]
    text = [t for t in text if len(t) > 1]
    title = next((t for t in text if "—" in t), ref)
    body, seen = [], set()
    for t in text:
        if (len(t) > 70 or t in ("Sound", "Weak", "Fabricated", "Good")) and t not in seen:
            seen.add(t); body.append(t)
    print(f"# {title}\n# source: https://hadithunlocked.com/{ref}\n")
    print("\n\n".join(body[:8]))

def quran(s, a):
    lo, hi = (a.split("-") + [a])[:2]
    for n in range(int(lo), int(hi) + 1):
        en = get("quran-api", f"eng-ummmuhammad/{s}/{n}")["text"]
        ar = get("quran-api", f"ara-quranuthmanihaf/{s}/{n}")["text"]
        print(f"# Qur'an {s}:{n}\nEN (Saheeh International): {en}\nAR: {ar}\n")

if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else ""
    if cmd == "page" and len(sys.argv) == 3:
        page(sys.argv[2]); sys.exit(0)
    if cmd not in ("hadith", "find", "quran") or len(sys.argv) < 4:
        print(__doc__); sys.exit(1)
    {"hadith": hadith, "find": find, "quran": quran}[cmd](sys.argv[2], " ".join(sys.argv[3:]) if cmd == "find" else sys.argv[3])
