# Project Architecture - Globe App

## Development Rules

### Modular Demo Structure

Each demo/prototype must be completely independent and contained within its own folder inside `src/demos/`.

#### Folder Structure

```
src/
  demos/
    [demo-name]/
      [DemoName].tsx          # Main demo component
      [DemoName].css          # Demo-specific styles
      components/             # Internal demo components (optional)
      utils/                  # Demo-specific utilities (optional)
      types/                  # Demo-specific TypeScript types (optional)
      hooks/                  # Demo-specific custom hooks (optional)
```

#### Isolation Rules

1. **Total Independence**: Each demo must be completely independent and not depend on other demos.

2. **No Cross-Dependencies**: 
   - Demos MUST NOT import components, utilities, or types from other demos.
   - Demos MUST NOT share state with other demos.

3. **Shared Components**: 
   - Only components in `src/components/` can be shared between demos.
   - These components must be generic and reusable.

4. **Adding/Removing Prototypes**:
   - To add a new demo: create a new folder in `src/demos/` and add the button in `Dashboard.tsx`.
   - To remove a demo: delete the entire folder and remove the button from the dashboard.
   - There should be no side effects when adding or removing demos.

5. **File Structure**:
   - Each demo must export its main component as a named export: `export function DemoName() { ... }`
   - Styles must be in a separate CSS file with the same name.

6. **Dashboard Integration**:
   - Add the button in `src/components/Dashboard.tsx` inside `.demo-grid`.
   - Add the case in `src/App.tsx` inside the active demos switch.
   - The `demoId` must match the folder name.

### New Demo Example

To add a new demo called "ThreeJS":

1. Create folder: `src/demos/threejs/`
2. Create component: `src/demos/threejs/ThreeJSDemo.tsx`
3. Create styles: `src/demos/threejs/ThreeJSDemo.css`
4. Add button in `Dashboard.tsx`:
   ```tsx
   <button 
     className="demo-card threejs-card"
     onClick={() => onDemoSelect('threejs')}
   >
     {/* button content */}
   </button>
   ```
5. Add case in `App.tsx`:
   ```tsx
   {activeDemo === 'threejs' && <ThreeJSDemo />}
   ```

### Naming Conventions

- Demo folders: `kebab-case` (e.g., `mapbox`, `threejs`, `webgl`)
- Components: `PascalCase` (e.g., `MapboxDemo`, `ThreeJSDemo`)
- CSS files: same name as component (e.g., `MapboxDemo.css`)

### Important Notes

- Keeping each demo as a self-contained module facilitates maintenance and scalability.
- This architecture allows working on multiple prototypes without interference.
- Prototypes can be removed without affecting the rest of the system.
