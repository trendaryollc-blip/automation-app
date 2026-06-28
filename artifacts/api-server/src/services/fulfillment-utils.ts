export function detectCategory(name: string): string {
  const n = name.toLowerCase();
  if (/phone|laptop|charge|cable|usb|gadget|electronic|watch|earbud|speaker|tech/.test(n)) return "tech";
  if (/health|fitness|gym|yoga|posture|muscle|vitamin|workout|exercise/.test(n)) return "health";
  if (/home|decor|light|candle|plant|organiz|storage|bedroom|living|desk|lamp/.test(n)) return "home";
  if (/cook|food|blender|coffee|cup|mug|bottle|tumbler|meal|kitchen/.test(n)) return "kitchen";
  if (/beauty|skin|hair|lip|face|makeup|serum|cream|mask/.test(n)) return "beauty";
  if (/pet|dog|cat|animal|paw|leash|treat/.test(n)) return "pet";
  if (/outdoor|camp|hike|hunt|fish|garden|sport|bike|tent/.test(n)) return "outdoor";
  return "general";
}
