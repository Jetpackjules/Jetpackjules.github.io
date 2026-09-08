# Robot Teleop Vision project page

## Scope and source

The requested reference is <https://robot-tv.github.io/>. The page adapts its academic project-page format: a white background, centered title and author block, charcoal resource pills, restrained blue links, and paired media. This is an original project page, not a copy of that project's wording, research claims, logos, videos, or author list.

The implementation adds `public/research/robot-teleop-vision/` to the existing Vite portfolio. The React routes, portfolio content, resume, global styles, package dependencies, and deployment workflow are unchanged. The clean checkout started from remote main `1fd85bb644301c07855b04223bea8f37c63bd650`, preserving the newer Bonk RL project absent from an older local checkout.

## Visual and interaction checks

- Compared reference and implementation in the same browser surface at 1280 × 900, both at scroll position zero. Intentional differences: the project's own logo, one author and RSE Lab credit as supplied by the user, fewer real resource links, and no paper or acceptance badge.
- Reviewed the page at 390 × 844. Heading and resource links wrap cleanly, paired clips stack, and the document has no horizontal overflow.
- Played both physical-session clips together. Both durations are 17.2 seconds; an observed mid-playback sample was 7.880722 and 7.885919 seconds. Restart pauses and resets both to zero. Both reached the same endpoint.
- Live media loaded to readyState 4. The full narrated video is 62.485 seconds including its audio/container tail.
- Viewpoint, live-demo, simulation, and hardware links target in-page sections. Code, hardware, author, and license links have real destinations.
- Reviewed the final simulation section on desktop and at 390 × 844. Fixed its video aspect ratio to remove letterboxing. Desktop shows the paired comparison; mobile shows the larger moving view and a link to the comparison. Both are 18 seconds and loaded to readyState 4. Resizing pauses the simulation players.
- No browser errors were reported for the final page. All 14 relative media, caption, script, and style references exist in the production output. `npm run build` passes; the existing portfolio bundle-size warning remains unrelated to this isolated static page.
- Verified an empty diff for the existing `src`, package files, deployment workflow, and root HTML.

## Media provenance

The logo comes from this project's existing branding asset. Operator and physical robot media come from the supplied Sweden–Singapore recordings. Their editorial alignment is not a measurement of network latency. The two short paired clips have no audio stream. The full demonstration retains the previously cleaned iPhone-only narration and English captions.

The virtual scene is generated and rendered by the standalone Godot alignment demo. The solid geometry is an explanatory reference. The depth-cloud mode samples first-hit surfaces from one fixed virtual sensor. Any recorded camera motion is a scripted replay, distinct from a recording of a person moving their head. No measured improvement, latency, reconstruction quality, or physical success rate is claimed.

## Status

Passed for the requested design adaptation, responsive layout, paired physical playback, media loading, and production build. The webcam and physical leader still require device testing by the user; they are features of the local demo rather than this static page.
