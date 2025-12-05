# Video Background Setup Instructions

## Where to Place Your Video File

1. **Place your video file in the `public` folder:**
   ```
   /public/hero-video.mp4
   ```

2. **Supported video formats:**
   - **MP4** (recommended) - `hero-video.mp4`
   - **WebM** (optional, for better compression) - `hero-video.webm`

## Video File Requirements

### Recommended Specifications:
- **Format:** MP4 (H.264 codec)
- **Resolution:** 1920x1080 (Full HD) or 1280x720 (HD)
- **Aspect Ratio:** 16:9 (works best for most screens)
- **Duration:** 15-60 seconds (will loop automatically)
- **File Size:** Try to keep under 10MB for faster loading
- **Content:** Should explain/showcase your website features

### Video Optimization Tips:
1. **Compress the video** to reduce file size:
   - Use tools like HandBrake, FFmpeg, or online compressors
   - Target: 2-5MB for best performance

2. **Create multiple formats** (optional but recommended):
   - MP4 for broad compatibility
   - WebM for modern browsers (smaller file size)

## How to Add Your Video

1. **Rename your video file to:** `hero-video.mp4`
2. **Copy it to:** `/public/hero-video.mp4`
3. **The code will automatically use it!**

## Alternative: Using a Different File Name

If you want to use a different file name, update the video source in:
`src/pages/Landing.jsx`

Change this line:
```jsx
<source src="/hero-video.mp4" type="video/mp4" />
```

To your file name:
```jsx
<source src="/your-video-name.mp4" type="video/mp4" />
```

## Video Content Suggestions

Your video should showcase:
- Family/housing themes
- Website features (housing, budget, documents, etc.)
- Happy families using the platform
- Modern, clean aesthetic
- Smooth, professional motion

## Testing

After adding your video:
1. Run `npm run build`
2. Test locally with `npm start`
3. Verify the video plays automatically and loops
4. Check on mobile devices (should work with `playsInline` attribute)

## Troubleshooting

**Video not playing?**
- Check file path is correct: `/public/hero-video.mp4`
- Verify file format is MP4
- Check browser console for errors
- Ensure video is not corrupted

**Video too large/slow loading?**
- Compress the video using HandBrake or similar
- Consider using WebM format for smaller size
- Reduce video resolution if needed

**Video not covering full background?**
- Ensure video is at least 1920x1080 resolution
- The `object-cover` CSS class handles scaling automatically



