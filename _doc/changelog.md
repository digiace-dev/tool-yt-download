# Changelog

All notable changes to the Media Downloader project.

## [Unreleased]

### Added
- **Progress Bar during Downloads** (2026-06-25)
  - Visual progress indicator appears when download starts
  - Simulated progress animation from 0-90% during processing
  - Completes to 100% when download finishes
  - Percentage text displays below progress bar
  - Gradient bar design matches app theme
  - Auto-hides after 1.5 seconds on success

- **Auto-select Highest Resolution** (2026-06-25)
  - Resolution chips now sorted in descending order (highest first)
  - Maximum available resolution automatically selected by default
  - Users can still manually select other resolutions
  - Smart sorting handles numeric (1080p, 720p) and non-numeric labels

- **Dark/Light Mode Toggle** (2026-06-25)
  - Circular toggle button fixed at top-right corner
  - One-click theme switching with smooth transitions
  - Theme preference persists via localStorage
  - Light mode variant for all UI components
  - Dynamic icon updates (🌙 for dark, ☀️ for light)

- **URL Input Auto-select** (2026-06-25)
  - Text automatically selected when URL input receives focus
  - Convenient for quickly replacing URLs

### Changed
- Resolution selector behavior: highest resolution now pre-selected instead of none

### Fixed
- None

---

## Future Improvements (Roadmap)

### Planned Features

#### High Priority
- **Real-time Download Progress**
  - Implement streaming fetch with ReadableStream
  - Track actual bytes downloaded vs total file size
  - Display accurate progress instead of simulation
  - Show download speed and estimated time remaining

- **Batch Downloads**
  - Support multiple URL input (comma-separated or line-by-line)
  - Queue management with parallel download limit
  - Individual progress tracking for each item
  - Bulk download as ZIP option

- **Download History**
  - Local storage of download history
  - Re-download previous media with one click
  - Clear history option
  - Export/import history

#### Medium Priority
- **Custom Quality Selection**
  - Allow users to set preferred default quality
  - Remember quality preference per platform
  - Audio bitrate selector for audio downloads
  - Video codec selection (H264, VP9, AV1)

- **Thumbnail Preview**
  - Click to enlarge thumbnail
  - Preview video frames on hover
  - Gallery view for multi-media posts

- **Advanced Settings Panel**
  - Download location preference (where browser allows)
  - File naming pattern customization
  - Auto-download toggle (skip preview card)
  - Subtitle/caption download options

- **Enhanced UI/UX**
  - Drag-and-drop URL support
  - Keyboard shortcuts (Enter to fetch, Ctrl+V to paste)
  - Copy URL from clipboard button
  - Toast notifications for actions

#### Low Priority
- **Multi-language Support**
  - Internationalization (i18n) framework
  - Language selector in settings
  - Support for Indonesian, English, Spanish, etc.

- **Browser Extension**
  - One-click download from social media pages
  - Context menu integration
  - Browser action popup with quick download

- **Metadata Display**
  - Show uploader/author name
  - Display upload date
  - View count and engagement metrics
  - Description/caption preview

- **Format Conversion**
  - Client-side format conversion (if feasible)
  - Trim/clip video before download
  - Audio normalization option
  - Resolution upscaling/downscaling

### Technical Improvements

- **Performance**
  - Implement caching for media info requests
  - Debounce platform detection on URL input
  - Lazy load non-critical components
  - Service worker for offline capability

- **Error Handling**
  - Retry mechanism for failed downloads
  - More descriptive error messages
  - Fallback sources for common failures
  - Network status detection

- **Accessibility**
  - Full ARIA labels and descriptions
  - Keyboard navigation support
  - Screen reader optimization
  - High contrast mode

- **Code Quality**
  - Migrate to TypeScript for type safety
  - Component-based architecture (React/Vue/Svelte)
  - Unit tests for core functions
  - E2E testing with Playwright

---

## Version History

### [1.1.0] - 2026-06-25
#### Added
- Progress bar with simulated animation
- Auto-select highest resolution
- Dark/light mode toggle with persistence
- URL input auto-select on focus

### [1.0.0] - Initial Release
#### Features
- Multi-platform support (YouTube, Facebook, Instagram, TikTok, X, Threads)
- Video and audio download options
- Resolution selector
- Responsive design
- Modern dark theme UI
