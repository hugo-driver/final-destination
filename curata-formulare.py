import re
import pathlib

POSTS = pathlib.Path("src/posts")

# Prinde blocul manual: titlul "#### ... abonezi la email-urile mele zilnice ..."
# (orice variatie, inclusiv </strong> sau "Alt lucru destept") urmat de include-ul formularului.
pattern = re.compile(
    r'\n*#{2,6}[^\n]*abonezi la email-urile mele zilnice[^\n]*'
    r'\s*\{%\s*include "partials/newsletter-form\.njk" %\}[ \t]*\n?'
)

if not POSTS.is_dir():
    raise SystemExit(
        "Nu gasesc folderul src/posts.\n"
        "Ruleaza scriptul din radacina proiectului (folderul final-destination)."
    )

changed = 0
for f in sorted(POSTS.rglob("*.md")):
    text = f.read_text(encoding="utf-8")
    if "newsletter-form.njk" not in text:
        continue
    new = pattern.sub("\n", text)
    new = new.rstrip() + "\n"
    if new != text:
        f.write_text(new, encoding="utf-8")
        changed += 1
        print("curatat:", f)

print(f"\nGata. Articole curatate: {changed}")
