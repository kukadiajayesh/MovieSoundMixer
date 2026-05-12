import os

filepath = 'L:/Downloads/Audio Manager/FFmpegAudioManager.py'
with open(filepath, 'r', encoding='utf-8') as f:
    code = f.read()

old_ext_icon = """def create_extract_icon(parent, size: int = 96) -> tk.Canvas:
    canvas = tk.Canvas(parent, width=size, height=size, bg='white', highlightthickness=0)

    margin = size // 10

    # Gradient-like blue background
    for i in range(margin, size - margin):
        ratio = (i - margin) / (size - 2 * margin)
        color_val = int(70 + (100 * ratio))
        color = f'#{color_val:02x}82{int(220 - 50*ratio):02x}'
        canvas.create_line(margin, i, size - margin, i, fill=color, width=1)"""

new_ext_icon = """def create_extract_icon(parent, size: int = 96) -> tk.Canvas:
    canvas = tk.Canvas(parent, width=size, height=size, bg='white', highlightthickness=0)

    margin = size // 10

    # Clean flat color for modern design (matching the React prototype)
    canvas.create_rectangle(margin, margin, size - margin, size - margin, fill='#0084c8', width=0, rx=8, ry=8) if hasattr(canvas, 'create_rounded_rect') else canvas.create_rectangle(margin, margin, size - margin, size - margin, fill='#0084c8', width=0)"""
code = code.replace(old_ext_icon, new_ext_icon)

old_add_icon = """def create_add_icon(parent, size: int = 96) -> tk.Canvas:
    canvas = tk.Canvas(parent, width=size, height=size, bg='white', highlightthickness=0)

    margin = size // 10

    # Gradient-like orange/gold background
    for i in range(margin, size - margin):
        ratio = (i - margin) / (size - 2 * margin)
        color_val = int(220 + (35 * ratio))
        color = f'#{color_val:02x}{int(180 - 50*ratio):02x}46'
        canvas.create_line(margin, i, size - margin, i, fill=color, width=1)"""

new_add_icon = """def create_add_icon(parent, size: int = 96) -> tk.Canvas:
    canvas = tk.Canvas(parent, width=size, height=size, bg='white', highlightthickness=0)

    margin = size // 10

    # Clean flat color for modern design
    canvas.create_rectangle(margin, margin, size - margin, size - margin, fill='#d68910', width=0, rx=8, ry=8) if hasattr(canvas, 'create_rounded_rect') else canvas.create_rectangle(margin, margin, size - margin, size - margin, fill='#d68910', width=0)"""
code = code.replace(old_add_icon, new_add_icon)


with open(filepath, 'w', encoding='utf-8') as f:
    f.write(code)
print("done")