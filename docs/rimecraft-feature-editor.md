# RimeCraft: Visual Editor + Asset Library Integrated Design

## Context

RimeCraft is an AI-driven game builder where an agent writes Phaser code via chat. The current architecture is: **Chat Panel | Preview Panel + Code Panel**. The preview runs in a blob: iframe sandbox.

The user wants to:
1. Upgrade the asset library (CDN + local cache, not purely local)
2. Embed a **visual scene editor** in the design page (inspired by PhaserEditor2D)
3. Make the visual editor work with the AI agent (agent can read/write scene state)
4. Unify asset management across code editor, visual editor, and agent

---

## Part 1: Visual Editor Architecture

### 1.1 Core Idea: Scene Graph JSON as Bridge

Inspired by PhaserEditor2D's `.scene` format, introduce a **scene description JSON** as the bridge between visual editing and code generation. Both the AI agent and the visual editor read/write this JSON; code is generated from it.

```
                  ┌──────────────────┐
                  │  Scene Graph JSON │  (source of truth)
                  │  project.scene    │
                  └────┬────────┬────┘
                       │        │
              ┌────────▼──┐  ┌──▼────────┐
              │ Visual    │  │ AI Agent  │
              │ Editor UI │  │ Tools     │
              └────────┬──┘  └──┬────────┘
                       │        │
                  ┌────▼────────▼────┐
                  │ Code Generator   │
                  │ scene → .ts code │
                  └────────┬─────────┘
                           │
                  ┌────────▼─────────┐
                  │ Game Compiler    │
                  │ .ts → sandbox    │
                  └──────────────────┘
```

### 1.2 Scene Graph JSON Format

```typescript
// src/core/scene-graph.ts

interface SceneGraph {
  version: 1;
  settings: {
    width: number;       // game width
    height: number;      // game height
    backgroundColor: string;
    physics?: { type: "arcade" | "matter"; gravity?: { x: number; y: number } };
  };
  assets: SceneAssetRef[];   // assets used in this scene
  objects: SceneObject[];     // display list (ordered, supports nesting)
}

interface SceneAssetRef {
  key: string;                // Phaser texture key
  assetId: string;            // reference to AssetRegistry entry
  type: "image" | "spritesheet" | "generated";
}

interface SceneObject {
  id: string;                 // UUID
  type: "sprite" | "image" | "text" | "graphics" | "container" | "tilemap" | "particles";
  name: string;               // variable name in generated code
  label?: string;             // display name in editor

  // Transform
  x: number;
  y: number;
  rotation?: number;          // radians
  scaleX?: number;
  scaleY?: number;
  originX?: number;
  originY?: number;

  // Display
  alpha?: number;
  visible?: boolean;
  depth?: number;
  tint?: number;

  // Type-specific
  texture?: string;           // key for sprite/image
  frame?: string | number;
  frameConfig?: { frameWidth: number; frameHeight: number };
  text?: string;              // for text objects
  style?: Record<string, any>; // text style
  generatorCode?: string;     // for graphics objects

  // Physics
  physics?: {
    type: "arcade";
    bodyType: "dynamic" | "static";
    bounce?: number;
    gravity?: boolean;
    collideWorldBounds?: boolean;
  };

  // Hierarchy
  children?: SceneObject[];   // for containers

  // Behavior (reference to code snippets, not full code)
  behaviors?: string[];       // e.g., ["player-movement", "collectible"]
}
```

### 1.3 UI Layout: Visual Editor as Preview Mode

Not a separate panel, but a **mode toggle on the existing PreviewPanel**. This avoids layout complexity and keeps the familiar two-panel structure:

```
┌─────────────────────────────────────────────────────────┐
│  EditorToolbar     [Play ▶] [Visual ◆] [Code </>]      │
├─────────────────────────────────────────────────────────┤
│                    │                                     │
│                    │  ┌─ Mode: Visual Editor ──────────┐ │
│   ChatPanel        │  │  [▸ Select] [↕ Move] [⟲ Rotate]│ │
│   (AI Chat)        │  │  [↔ Scale] [+ Add Object]     │ │
│                    │  ├────────────────────────────────┤ │
│                    │  │                                │ │
│                    │  │    Phaser Canvas (interactive) │ │
│                    │  │    - Click to select objects   │ │
│                    │  │    - Drag to move              │ │
│                    │  │    - Handles for resize/rotate │ │
│                    │  │    - Grid snap                 │ │
│                    │  │                                │ │
│                    │  ├────────────────────────────────┤ │
│                    │  │  Inspector (bottom/right)      │ │
│                    │  │  - Object properties           │ │
│                    │  │  - Transform (x, y, scale...)  │ │
│                    │  │  - Physics settings             │ │
│                    │  │  - Asset/texture selector       │ │
│                    │  └────────────────────────────────┘ │
│                    │                                     │
│                    │  ┌─ CodePanel (collapsible) ──────┐ │
│                    │  │  Generated code (read-only)    │ │
│                    │  │  + custom code sections        │ │
│                    │  └────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

### 1.4 Visual Editor Implementation

**NOT a separate canvas** - reuse the existing preview iframe with an **editor overlay**:

```
┌─ PreviewPanel (mode: visual) ────────────────┐
│                                               │
│  ┌─ iframe (Phaser game, edit mode) ───────┐  │
│  │  - Phaser renders scene normally         │  │
│  │  - Bridge reports object list & bounds   │  │
│  └──────────────────────────────────────────┘  │
│                                               │
│  ┌─ Overlay <div> (absolute positioned) ───┐  │
│  │  - Selection rectangles (CSS borders)    │  │
│  │  - Drag handles (resize corners)         │  │
│  │  - Rotation handle (circle at top)       │  │
│  │  - Snap lines (visual guides)            │  │
│  │  - Object labels (name badges)           │  │
│  └──────────────────────────────────────────┘  │
│                                               │
└───────────────────────────────────────────────┘
```

**Why overlay instead of in-iframe tools?**
- The iframe runs untrusted game code; overlay is in the trusted React context
- React state management for tools, inspector, undo/redo
- No need to inject editor UI code into the sandbox
- Simpler coordinate mapping (iframe bounds → screen coords)

**Bridge Protocol Extension** (iframe ↔ parent messaging):

```typescript
// Parent → iframe
{ type: "scene_inspect" }                    // request full scene tree
{ type: "object_inspect", id: string }       // get object properties
{ type: "object_update", id: string, props: {} }  // modify object
{ type: "object_create", objectData: {} }    // add new object
{ type: "object_delete", id: string }        // remove object
{ type: "set_edit_mode", enabled: boolean }  // pause physics, show all

// iframe → parent
{ type: "scene_tree", objects: SceneObjectInfo[] }  // object list with bounds
{ type: "object_props", id: string, props: {} }     // object details
{ type: "object_bounds_update", updates: [] }       // real-time position sync
```

### 1.5 Agent Visual Editing Tools

New agent tools that operate on the scene graph:

```typescript
// New tools for agent-manager.ts

// Read scene state
"inspect_scene"    → returns SceneGraph JSON (all objects, positions, properties)

// Object manipulation
"place_object"     → { type, texture, x, y, name, properties }
"update_object"    → { id, properties: { x?, y?, scale?, ... } }
"remove_object"    → { id }
"group_objects"    → { ids, containerName }

// Batch operations
"layout_objects"   → { ids, layout: "grid" | "row" | "column", spacing }

// Scene settings
"set_scene_config" → { width, height, backgroundColor, physics }
```

**Agent workflow example:**
```
User: "把玩家放在左下角，添加3个平台"
Agent:
  1. inspect_scene → sees current state
  2. update_object({ name: "player", x: 100, y: 500 })
  3. place_object({ type: "image", texture: "platform", x: 200, y: 550, name: "platform1" })
  4. place_object({ type: "image", texture: "platform", x: 450, y: 400, name: "platform2" })
  5. place_object({ type: "image", texture: "platform", x: 700, y: 300, name: "platform3" })
  → Visual editor updates live, user sees objects appear
```

---

## Part 2: Asset Library with CDN + Local Cache

### 2.1 Strategy: CDN-First with ServiceWorker Cache

Not purely local, not purely CDN. Use a **cache-first strategy** with ServiceWorker:

```
Asset Request Flow:
  1. Check ServiceWorker cache → if hit, return cached (instant)
  2. If miss, fetch from CDN (labs.phaser.io or custom CDN)
  3. Cache response in ServiceWorker for future use
  4. Fallback to bundled /assets/ for core assets (offline guarantee)
```

**Why this is better than pure local:**
- No need to download/bundle 90 PNGs (smaller package size)
- First load fetches from CDN; subsequent loads are instant from cache
- Core assets (used in templates) are still bundled locally as fallback
- User can use the app offline after first visit

### 2.2 Implementation

```typescript
// src/lib/assets/asset-cache.ts

const ASSET_CACHE_NAME = "rimecraft-assets-v1";
const CDN_BASE = "https://labs.phaser.io/assets";
const LOCAL_BASE = "/assets";

/**
 * Resolve an asset URL, preferring cache → CDN → local fallback
 */
export async function resolveAssetUrl(relativePath: string): Promise<string> {
  const cdnUrl = `${CDN_BASE}/${relativePath}`;
  const localUrl = `${LOCAL_BASE}/${relativePath}`;

  // In ServiceWorker context, cache handles this transparently
  // In non-SW context (Tauri), try local first
  if (isTauri()) {
    return localUrl;
  }
  return cdnUrl;  // SW will intercept and serve from cache
}
```

**ServiceWorker registration** (`sw.ts`):
```typescript
// Cache-first strategy for asset URLs
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (url.hostname === "labs.phaser.io" || url.pathname.startsWith("/assets/")) {
    event.respondWith(
      caches.open(ASSET_CACHE_NAME).then(cache =>
        cache.match(event.request).then(cached =>
          cached || fetch(event.request).then(response => {
            cache.put(event.request, response.clone());
            return response;
          })
        )
      )
    );
  }
});
```

### 2.3 Asset Catalog Changes

```typescript
// asset-catalog.ts changes

// Before: hardcoded CDN URLs
url: "https://labs.phaser.io/assets/sprites/dude.png",
preloadCode: `this.load.spritesheet("dude", "https://labs.phaser.io/assets/sprites/dude.png", ...)`,

// After: relative paths + runtime resolution
url: "/assets/sprites/dude.png",
preloadCode: `this.load.spritesheet("dude", "/assets/sprites/dude.png", ...)`,
// game-compiler injects __ASSET_BASE__ for iframe resolution
```

### 2.4 game-compiler.ts: Asset Base URL Injection

```typescript
// In generateSandboxHtml():
const origin = typeof window !== "undefined" ? window.location.origin : "";

// Inject asset base for all preload calls
const bridgeCode = `
  window.__ASSET_BASE__ = "${origin}";
  // Override Phaser loader to prepend base URL
  const _origLoad = Phaser.Loader.LoaderPlugin.prototype.addFile;
  Phaser.Loader.LoaderPlugin.prototype.addFile = function(file) {
    if (file.url && file.url.startsWith("/assets/")) {
      file.url = window.__ASSET_BASE__ + file.url;
    }
    return _origLoad.call(this, file);
  };
`;
```

This approach means:
- asset-catalog.ts uses clean relative paths `/assets/...`
- Templates use clean relative paths
- game-compiler handles origin resolution at runtime
- Works for both Web (`http://localhost:3000`) and Tauri (`tauri://localhost`)

### 2.5 Tauri Compatibility

For Tauri (desktop app), no ServiceWorker needed:
- Bundle core template assets in `apps/tauri/public/assets/` (just ~20 essential files used by templates, not all 90)
- Other assets load from CDN when online
- `isTauri()` check in asset resolution

```
apps/web/public/assets/        ← Core assets only (~20 files: dude, platform, sky, etc.)
  sprites/dude.png
  sprites/platform.png
  skies/sky1.png
  ... (only what templates actually use)
```

### 2.6 Preview Thumbnails

Keep the existing `asset-previewer.ts` approach (Canvas 2D simulation for generatorCode, img load for URLs). Add:

- **Lazy loading**: Only render thumbnails for visible grid items (IntersectionObserver)
- **Cache**: Persist rendered thumbnails in a Map keyed by asset ID
- **Placeholder**: Show category icon while thumbnail loads

---

## Part 3: Unified Asset Registry

### 3.1 Extended AssetEntry

```typescript
// asset-registry.ts - extended interface

interface AssetEntry {
  // ... existing fields ...

  // NEW: CSS asset support
  type: "texture" | "spritesheet" | "audio" | "particle-config" | "tileset" | "css";
  cssCode?: string;           // original CSS input
  cssWidth?: number;
  cssHeight?: number;

  // NEW: visual editor integration
  defaultProperties?: {       // default placement properties
    width?: number;
    height?: number;
    originX?: number;
    originY?: number;
    physics?: "static" | "dynamic";
  };
}
```

### 3.2 Asset Library UI Enhancements

```
┌─────────────────────────────────────────────────────┐
│  Asset Library                                 [×]  │
├─────────────────────────────────────────────────────┤
│ [🔍 Search...]              [+ Upload] [CSS] [AI]  │
├─────────────────────────────────────────────────────┤
│ All | Characters | Env | Items | FX | Shapes | My   │
├────────┬────────┬────────┬────────┬─────────────────┤
│ ┌────┐ │ ┌────┐ │ ┌────┐ │ ┌────┐ │                 │
│ │ 🎮 │ │ │ 👾 │ │ │ 🌿 │ │ │ ⭐ │ │                 │
│ └────┘ │ └────┘ │ └────┘ │ └────┘ │                 │
│ Player │ Enemy  │ Ground │ Coin   │   ...           │
├────────┴────────┴────────┴────────┴─────────────────┤
│  [Click asset] → Detail panel:                      │
│  ┌─────────────────────────────────────────────┐    │
│  │  Name: coin     [Insert Code] [Place] [Del] │    │
│  │  Category: item  Source: builtin             │    │
│  │  Preview: [64x64 canvas]                     │    │
│  │  Code: const g = this.add.graphics()...      │    │
│  └─────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────┘
```

**New buttons:**
- **"Insert Code"** → copies preloadCode/generatorCode to clipboard or inserts into code editor
- **"Place"** → switches to visual editor mode, enters placement tool with this asset
- **"CSS"** → opens CSS editor sub-panel (textarea + size + live preview + save)
- **"AI"** → prompt input → calls generate_asset tool → preview → save to registry
- **"Del"** → only for non-builtin assets

### 3.3 Drag & Drop from Asset Library to Visual Editor

When visual editor mode is active:
1. User drags asset from library grid
2. Shows ghost preview following cursor over the canvas
3. Drop creates `place_object` call → scene graph update → code regeneration → preview refresh

---

## Part 4: Implementation Phases

### Phase 1: Asset Library Foundation (Week 1)
**Goal: CDN caching + local fallback + UI polish**

Files to modify:
- `apps/web/src/lib/assets/asset-catalog.ts` — CDN URLs → relative paths `/assets/...`
- `apps/web/src/core/game-compiler.ts` — inject `__ASSET_BASE__` for iframe asset resolution
- `apps/web/src/lib/templates/*.ts` — update all 6 templates to use relative paths
- `apps/web/public/assets/` — bundle ~20 core template assets locally
- `apps/web/src/lib/assets/asset-cache.ts` — NEW: ServiceWorker cache strategy
- `apps/web/src/lib/assets/asset-registry.ts` — extend AssetEntry with `css` type
- `apps/web/src/components/editor/asset-library-dialog.tsx` — grid UI polish, lazy thumbnails, delete button, category upload
- `apps/web/src/lib/assets/css-to-canvas.ts` — NEW: CSS → Graphics API converter
- `apps/web/src/i18n/zh.ts`, `en.ts` — CSS/upload i18n strings

### Phase 2: Scene Graph + Bridge Protocol (Week 2)
**Goal: Scene JSON format + iframe bridge for object inspection**

Files to create/modify:
- `apps/web/src/core/scene-graph.ts` — NEW: SceneGraph, SceneObject interfaces + serialization
- `apps/web/src/core/game-compiler.ts` — inject scene inspection bridge code into sandbox
- `apps/web/src/stores/visual-editor-store.ts` — NEW: Zustand store for visual editor state
- `apps/web/src/core/scene-bridge.ts` — NEW: parent↔iframe message protocol for scene inspection

### Phase 3: Visual Editor UI (Week 3)
**Goal: Mode toggle + overlay tools + inspector panel**

Files to create/modify:
- `apps/web/src/components/editor/panels/visual-editor-panel.tsx` — NEW: visual editor overlay
- `apps/web/src/components/editor/visual/tool-bar.tsx` — NEW: tool selector (select/move/rotate/scale)
- `apps/web/src/components/editor/visual/inspector.tsx` — NEW: property inspector for selected object
- `apps/web/src/components/editor/visual/overlay-renderer.tsx` — NEW: selection boxes, handles, snap lines
- `apps/web/src/components/editor/panels/preview-panel.tsx` — add visual mode toggle
- `apps/web/src/components/editor/editor-toolbar.tsx` — add Visual Editor button
- `apps/web/src/stores/editor-store.ts` — add `visualEditorMode` state

### Phase 4: Agent Integration (Week 4)
**Goal: Agent tools for visual editing + bidirectional sync**

Files to modify:
- `apps/web/src/core/agent-manager.ts` — add inspect_scene, place_object, update_object, remove_object tools
- `apps/web/src/core/scene-codegen.ts` — NEW: SceneGraph → TypeScript code generator
- `apps/web/src/lib/agent/system-prompt.ts` — update with visual editing capabilities
- `apps/web/src/core/scene-bridge.ts` — add object creation/update/delete messages

---

## Part 5: Verification

### Asset Library Verification
- [ ] Open asset library → all thumbnails display (no broken images)
- [ ] Disconnect network → thumbnails still show from cache (after first load)
- [ ] Upload image → appears in "My" tab with correct thumbnail
- [ ] Create CSS asset → live preview → save → appears in library
- [ ] Delete user asset → removed from list
- [ ] Use asset in template → game preview loads correctly
- [ ] Tauri desktop build → templates work offline with bundled core assets

### Visual Editor Verification
- [ ] Toggle visual editor mode → game pauses, objects inspectable
- [ ] Click object → selection rectangle appears, inspector shows properties
- [ ] Drag object → position updates, code regenerates
- [ ] Place new object from asset library → appears in scene + generated code
- [ ] Agent `place_object` → object appears in visual editor
- [ ] Agent `update_object` → visual editor reflects change
- [ ] Undo/redo works across visual edits

### Cross-Platform
- [ ] Web (localhost:3000) → asset loading, visual editing, agent tools all work
- [ ] Tauri (desktop) → same features work with tauri:// origin
