import json

with open('colors-data.json', encoding='utf-8') as f:
    colors = json.load(f)

# Slim records for the client: name, hex, group. Drop w3c/aliases (unused by the game logic).
slim = [{"name": c["name"], "hex": c["hex"], "group": c["group"]} for c in colors]

out_path = '../colors-data.js'
with open(out_path, 'w', encoding='utf-8') as f:
    f.write('// Auto-generated from computerhope.com/htmcolor.htm — do not hand-edit.\n')
    f.write('// Regenerate via tools/parse_colors.py + tools/make_js_data.py if the source list changes.\n')
    f.write('const COLORS = ')
    json.dump(slim, f, indent=0)
    f.write(';\n')

print(f"Wrote {len(slim)} colors to {out_path}")
